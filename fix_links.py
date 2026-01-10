import os
import re

def slugify_link(match):
    prefix = match.group(1)
    name = match.group(2)
    # Convert to lowercase and replace underscores with hyphens
    slugified = name.lower().replace('_', '-')
    return f'{prefix}{slugified}'

count = 0
for root, dirs, files in os.walk('docs'):
    for file in files:
        if file.endswith('.md'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Replace /items/prefix/Name and /items/suffix/of_Name patterns
            original = content
            content = re.sub(r'(/items/prefix/)([^)\s]+)', slugify_link, content)
            content = re.sub(r'(/items/suffix/)([^)\s]+)', slugify_link, content)
            
            if content != original:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                count += 1
                print(f'Updated: {filepath}')

print(f'\nTotal files updated: {count}')
