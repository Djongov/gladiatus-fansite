#!/usr/bin/env python3
"""
Fix broken suffix and prefix links in forging goods documentation.
Converts relative suffix links to absolute paths with dynamic routing.
"""

import os
import re
from pathlib import Path

def fix_suffix_links(content):
    """
    Fix suffix links from relative to absolute /items/suffix/ paths.
    Also converts underscores to hyphens in the paths.
    """
    # Pattern matches: [text](of-name "title") or [text](of_the-name "title")
    # Captures the full link including brackets
    pattern = r'\[([^\]]+)\]\((of[_-][^\)]+?)\s+"[^"]*"\)'
    
    def replace_suffix(match):
        text = match.group(1)
        suffix_path = match.group(2)
        
        # Replace underscores with hyphens in the path
        suffix_path_fixed = suffix_path.replace('_', '-')
        
        # Create the new link with absolute path
        return f'[{text}](/items/suffix/{suffix_path_fixed} "{text.lower()}")'
    
    # Replace all suffix links
    fixed_content = re.sub(pattern, replace_suffix, content)
    
    return fixed_content

def process_file(file_path):
    """Process a single markdown file to fix suffix links."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        fixed_content = fix_suffix_links(content)
        
        if fixed_content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function to process all forging goods files."""
    base_dir = Path('docs/forging/forging-goods')
    
    if not base_dir.exists():
        print(f"Directory {base_dir} not found!")
        return
    
    files_changed = []
    files_processed = 0
    
    # Process all markdown files except index files
    for md_file in base_dir.rglob('*.md'):
        if md_file.name != 'index.md':
            files_processed += 1
            if process_file(md_file):
                files_changed.append(str(md_file))
                print(f"✓ Fixed: {md_file}")
    
    print(f"\n{'='*60}")
    print(f"Summary:")
    print(f"  Files processed: {files_processed}")
    print(f"  Files changed: {len(files_changed)}")
    print(f"{'='*60}")
    
    if files_changed:
        print("\nChanged files:")
        for file in sorted(files_changed):
            print(f"  - {file}")

if __name__ == '__main__':
    main()
