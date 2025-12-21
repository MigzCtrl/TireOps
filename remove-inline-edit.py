#!/usr/bin/env python3
"""
Remove the inline edit form from the inventory tire cards.
"""

with open('D:/Tire-Shop-MVP/src/app/inventory/page.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and remove the inline edit form section
# Looking for the section that starts with {editingTireId === tire.id ? (
# and ends with the corresponding closing braces

in_edit_section = False
edit_start = None
edit_end = None
brace_count = 0

for i, line in enumerate(lines):
    if '{editingTireId === tire.id ? (' in line:
        in_edit_section = True
        edit_start = i
        brace_count = 1
    elif in_edit_section:
        # Count braces to find the end
        brace_count += line.count('{') - line.count('}')
        if ') : (' in line and brace_count == 0:
            # Found the end of the conditional, now we're in the else part
            in_edit_section = False
        elif in_edit_section and brace_count < 0:
            edit_end = i
            break

# Remove the edit form section, but keep the else part
if edit_start and edit_end:
    # Find the line with "/* Regular View */"
    regular_view_line = None
    for i in range(edit_start, edit_end + 1):
        if '/* Regular View */' in lines[i]:
            regular_view_line = i
            break

    # Remove lines from edit_start to regular_view_line - 2 (keeping the : ( part)
    # Actually, we want to completely remove the ternary and just keep the regular view

    # Let's find where "/* Regular View */" and its wrapping starts
    if regular_view_line:
        # Remove everything from editingTireId line to just before the regular view content
        # Keep from the opening of the div with tire content
        del lines[edit_start:regular_view_line - 2]  # Remove the edit form part

with open('D:/Tire-Shop-MVP/src/app/inventory/page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("[OK] Inline edit form removed from inventory page")
