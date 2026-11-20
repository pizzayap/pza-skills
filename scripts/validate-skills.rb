#!/usr/bin/env ruby
# Static package checks only. Never execute skill content or inspect global state.
require 'json'
require 'pathname'
require 'uri'
require 'yaml'

root = Pathname.new(ARGV.fetch(0, File.expand_path('..', __dir__))).realpath
errors = []
names = []
skill_files = root.glob('skills/*/SKILL.md').sort
errors << 'No skills found under skills/<name>/SKILL.md' if skill_files.empty?

within = lambda do |path, boundary|
  path.to_s.start_with?(boundary.to_s + File::SEPARATOR)
end

read_package_file = lambda do |file, boundary|
  if !file.file? || !within.call(file.realpath, boundary)
    errors << "#{file.relative_path_from(root)}: missing file or resource outside its package"
    next nil
  end
  file.read(encoding: 'UTF-8')
rescue Errno::ENOENT, Errno::EACCES, ArgumentError => e
  errors << "#{file}: #{e.class}"
  nil
end

check_links = lambda do |file, text, boundary|
  # This repository uses inline links. Ignore literal examples in code.
  prose = text.gsub(/^([ \t]*)(`{3,}|~{3,}).*?^\1\2[ \t]*$/m, '')
              .gsub(/(`+).*?\1/m, '')
  prose.scan(/\[[^\]]+\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\s*\)/).flatten.each do |target|
    target = target.delete_prefix('<').delete_suffix('>')
    next if target.start_with?('#') || target.match?(/\A(?:https?|mailto):/)

    relative = Pathname.new(URI::DEFAULT_PARSER.unescape(target.split(/[?#]/, 2).first.to_s))
    resolved = file.dirname.join(relative).cleanpath
    if relative.absolute? || !within.call(resolved, boundary) || !resolved.file? ||
       !within.call(resolved.realpath, boundary)
      errors << "#{file.relative_path_from(root)}: broken or out-of-scope link #{target}"
    end
  end
end

retired_dependency = /pza-runtime|pza-settings|run-reviewer|skill-status|collect-review-context|collect-plan-context|\.pza-skills|(?:\.\.\/)+agents\//
personal_path = %r{(?:/Users/[^/\s]+/|/home/[^/\s]+/|[A-Za-z]:\\Users\\)}

skill_files.each do |file|
  directory = file.dirname
  if directory.symlink?
    errors << "#{directory.relative_path_from(root)}: canonical skill must be a directory, not a symlink"
    next
  end
  text = read_package_file.call(file, directory)
  next unless text

  frontmatter = text.match(/\A---\r?\n(.*?)\r?\n---(?:\r?\n|\z)(.*)\z/m)
  unless frontmatter
    errors << "#{file.relative_path_from(root)}: missing YAML frontmatter"
    next
  end
  begin
    metadata = YAML.safe_load(frontmatter[1])
    raise ArgumentError, 'frontmatter must be a mapping' unless metadata.is_a?(Hash)
    mapping = Psych.parse(frontmatter[1]).root
    keys = mapping.children.each_slice(2).map { |key, _value| key.value }
    raise ArgumentError, 'duplicate metadata key' unless keys.uniq == keys
    name = metadata['name']
    unless name.is_a?(String) && name.length <= 64 && name.match?(/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/) && name == directory.basename.to_s
      raise ArgumentError, 'name must match its directory and use lowercase kebab-case (1-64 characters)'
    end
    description = metadata['description']
    unless description.is_a?(String) && !description.strip.empty? && description.length <= 1024
      raise ArgumentError, 'description must contain 1-1024 characters'
    end
    raise ArgumentError, 'skill body is empty' if frontmatter[2].strip.empty?
    names << name
  rescue Psych::Exception, ArgumentError => e
    errors << "#{file.relative_path_from(root)}: invalid metadata (#{e.message.lines.first.strip})"
  end

  directory.glob('**/*.md').sort.each do |resource|
    next if resource.each_filename.include?('node_modules') # installed dependencies, never committed
    content = read_package_file.call(resource, directory)
    next unless content
    check_links.call(resource, content, directory)
    errors << "#{resource.relative_path_from(root)}: retired framework dependency" if content.match?(retired_dependency)
    errors << "#{resource.relative_path_from(root)}: personal absolute path" if content.match?(personal_path)
    errors << "#{resource.relative_path_from(root)}: load-time command injection" if content.match?(/!`/)
  end
end

# Lab chrome is copied into each skill that uses it. Same-named copies must stay byte-identical.
lab_copies = Hash.new { |hash, key| hash[key] = [] }
skill_files.each do |file|
  directory = file.dirname
  next if directory.symlink?
  directory.glob('assets/**/lab-*').sort.each do |asset|
    next if asset.directory? || asset.each_filename.include?('node_modules')
    lab_copies[asset.basename.to_s] << [asset, directory]
  end
end
lab_copies.sort.each do |basename, copies|
  next if copies.length < 2
  variants = copies.group_by { |asset, directory| read_package_file.call(asset, directory) }
  next if variants.length < 2 || variants.key?(nil)
  listing = variants.values.map { |group| group.map { |asset, _| asset.relative_path_from(root) }.join(', ') }.join(' | ')
  errors << "#{basename}: copies differ across skills (#{listing}); keep every copy byte-identical"
end

errors << 'Duplicate skill names' unless names.uniq == names
readme = read_package_file.call(root.join('README.md'), root)
if readme
  catalog = readme.scan(/\]\(skills\/([^\/]+)\/SKILL\.md\)/).flatten
  errors << 'README skill catalog differs from canonical skill folders' unless catalog.sort == names.sort
end

[root.join('README.md'), *root.glob('docs/*.md')].each do |file|
  text = read_package_file.call(file, root)
  check_links.call(file, text, root) if text
end

fixture_file = root.join('scripts/fixtures/astra-instruction-audit.json')
fixture_text = read_package_file.call(fixture_file, root)
if fixture_text
  begin
    fixture = JSON.parse(fixture_text)
    raise ArgumentError, 'fixture files must be a nonempty mapping' unless fixture['files'].is_a?(Hash) && !fixture['files'].empty?
    fixture['files'].each do |name, content|
      path = Pathname.new(name)
      if path.absolute? || name.include?('\\') || name.include?("\0") || name.split('/').include?('..') || !content.is_a?(String)
        raise ArgumentError, 'unsafe fixture path or non-string content'
      end
    end
    %w[audit update].each do |mode|
      request = fixture.fetch('requests').fetch(mode)
      raise ArgumentError, 'fixture request must be nonempty text' unless request.is_a?(String) && !request.strip.empty?
    end
  rescue JSON::ParserError, ArgumentError, KeyError, TypeError => e
    errors << "#{fixture_file.relative_path_from(root)}: invalid fixture (#{e.class})"
  end
end

# Every skill ships evals/evals.json and evals/trigger-queries.json (agentskills.io formats).
# Shape only: nothing here runs an eval or a model.
skill_folders = skill_files.map { |file| file.dirname.basename.to_s }
report = ->(file, message) { errors << "#{file.relative_path_from(root)}: #{message}" }
nonempty = ->(value) { value.is_a?(String) && !value.strip.empty? }
load_eval_json = lambda do |file, directory|
  text = read_package_file.call(file, directory)
  next :unreadable unless text
  JSON.parse(text)
rescue JSON::ParserError
  report.call(file, 'invalid JSON')
  :unreadable
end
seen_queries = {}
skill_files.each do |file|
  directory = file.dirname
  next if directory.symlink?
  skill = directory.basename.to_s

  evals_file = directory.join('evals/evals.json')
  suite = load_eval_json.call(evals_file, directory)
  unless suite == :unreadable
    cases = suite['evals'] if suite.is_a?(Hash)
    report.call(evals_file, 'skill_name must equal the folder name') unless suite.is_a?(Hash) && suite['skill_name'] == skill
    if !cases.is_a?(Array) || cases.length < 3 || !cases.all?(Hash)
      report.call(evals_file, 'evals must be an array of at least 3 objects')
    else
      ids = cases.map { |entry| entry['id'] }
      report.call(evals_file, 'eval ids must be unique integers') unless ids.all?(Integer) && ids.uniq == ids
      cases.each_with_index do |entry, index|
        label = "eval #{index + 1}"
        report.call(evals_file, "#{label} needs a non-empty prompt and expected_output") unless nonempty.(entry['prompt']) && nonempty.(entry['expected_output'])
        if entry.key?('assertions') && !(entry['assertions'].is_a?(Array) && entry['assertions'].all?(&nonempty))
          report.call(evals_file, "#{label} assertions must be an array of non-empty strings")
        end
        next unless entry.key?('files')
        inside = lambda do |path|
          next false unless nonempty.(path) && !path.include?("\0") && !Pathname.new(path).absolute?
          target = directory.join(path).cleanpath
          target.file? && within.call(target.realpath, directory)
        end
        report.call(evals_file, "#{label} files must be existing paths inside the skill folder") unless entry['files'].is_a?(Array) && entry['files'].all?(&inside)
      end
    end
  end

  queries_file = directory.join('evals/trigger-queries.json')
  queries = load_eval_json.call(queries_file, directory)
  next if queries == :unreadable
  unless queries.is_a?(Array) && queries.length >= 16 && queries.all?(Hash)
    report.call(queries_file, 'must be an array of at least 16 query objects')
    next
  end
  queries.each_with_index do |entry, index|
    label = "query #{index + 1}"
    unless nonempty.(entry['query']) && [true, false].include?(entry['should_trigger']) && %w[train validation].include?(entry['split'])
      report.call(queries_file, "#{label} needs a non-empty query, boolean should_trigger, and split train or validation")
    end
    if entry.key?('instead')
      report.call(queries_file, "#{label} has instead but should_trigger is not false") unless entry['should_trigger'] == false
      report.call(queries_file, "#{label} instead must name another skill folder") unless skill_folders.include?(entry['instead']) && entry['instead'] != skill
    end
    next unless nonempty.(entry['query'])
    key = entry['query'].strip.downcase(:fold)
    where = "#{queries_file.relative_path_from(root)} #{label}"
    report.call(queries_file, "#{label} duplicates #{seen_queries[key]}") if seen_queries.key?(key)
    seen_queries[key] ||= where
  end
  [true, false].each do |expected|
    report.call(queries_file, "needs at least 8 queries with should_trigger #{expected}") if queries.count { |entry| entry['should_trigger'] == expected } < 8
  end
  %w[train validation].each do |split|
    labels = queries.select { |entry| entry['split'] == split }.map { |entry| entry['should_trigger'] }
    report.call(queries_file, "#{split} split needs both should_trigger true and false queries") unless labels.include?(true) && labels.include?(false)
  end
end

if errors.empty?
  puts "PASS: #{names.length} independent skills; metadata, resources, catalog, dependency scans, lab kit copies, fixture paths, and eval file shapes checked."
else
  errors.each { |error| warn "FAIL: #{error}" }
  exit 1
end
