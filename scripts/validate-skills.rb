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
    content = read_package_file.call(resource, directory)
    next unless content
    check_links.call(resource, content, directory)
    errors << "#{resource.relative_path_from(root)}: retired framework dependency" if content.match?(retired_dependency)
    errors << "#{resource.relative_path_from(root)}: personal absolute path" if content.match?(personal_path)
    errors << "#{resource.relative_path_from(root)}: load-time command injection" if content.match?(/!`/)
  end
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

if errors.empty?
  puts "PASS: #{names.length} independent skills; metadata, resources, catalog, dependency scans, and fixture paths checked."
else
  errors.each { |error| warn "FAIL: #{error}" }
  exit 1
end
