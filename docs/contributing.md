---
title: Contributing
description: Learn how to contribute to Gladiatus Fansite - from fixing typos to adding new features
slug: /contributing
sidebar_class_name: hidden
keywords: [contributing, open source, github, documentation]
tags:
  - contributing
---

# Contributing to Gladiatus Fansite

Thanks for your interest in contributing! Whether you're fixing a typo or building a new feature, all contributions are welcome and appreciated.

This guide will walk you through everything you need to know to contribute successfully.

---

## 🎯 Quick Start

**Never contributed to an open-source project before?** No problem! We welcome first-time contributors.

**Already familiar with GitHub?** Jump to [Contribution Workflow](#contribution-workflow).

**Want to make a quick fix?** You can edit most pages directly on GitHub without setting up anything locally. Look for the "Edit this page" link at the bottom of any page.

---

## 📋 Types of Contributions

We welcome all types of contributions, no matter how big or small:

### 🔰 Beginner-Friendly (No coding required)

Perfect if you're new to contributing:

- **Fix typos or grammar errors** - Found a mistake? Fix it!
- **Improve documentation clarity** - Make guides easier to understand
- **Report bugs or issues** - Let us know what's broken
- **Suggest new features** - Share your ideas
- **Update outdated information** - Keep content current
- **Add missing item data** - Help complete the database

### 🟡 Intermediate (Some coding helpful)

If you're comfortable with basic web technologies:

- **Update JSON data files** - Item stats, dungeons, expeditions
- **Improve component styling** - Make things look better
- **Add new documentation pages** - Write new guides
- **Update images and assets** - Add screenshots or icons
- **Fix component behavior** - Small bug fixes in React components

### 🔴 Advanced (Developer experience)

For those with development experience:

- **Build new calculators or tools** - React components
- **Optimize performance** - Build times, bundle size
- **Refactor code** - Improve maintainability
- **Add new features** - Complex functionality
- **Database improvements** - Schema changes, data validation

---

## 🛠️ Contribution Workflow

### For Contributors Without Write Access

Most contributors will follow this workflow:

#### Step 1: Fork the Repository

1. Go to the [Gladiatus Fansite repository](https://github.com/Djongov/gladiatus-fansite)
2. Click the **Fork** button in the top-right corner
3. This creates a copy of the repository under your GitHub account

#### Step 2: Clone Your Fork

```bash
git clone https://github.com/<your-username>/gladiatus-fansite.git
cd gladiatus-fansite
```

#### Step 3: Create a Branch

Always create a new branch for your changes:

```bash
git checkout -b fix/typo-in-forging-guide
# or
git checkout -b feature/new-calculator
# or  
git checkout -b docs/improve-contributing-guide
```

**Branch naming conventions:**
- `fix/` - Bug fixes
- `feature/` - New features
- `docs/` - Documentation changes
- `style/` - Styling/UI improvements
- `refactor/` - Code refactoring

#### Step 4: Make Your Changes

Edit the files you want to change. See [Project Structure](#project-structure) to understand where things are.

#### Step 5: Test Your Changes (Optional but Recommended)

```bash
npm install
npm start
```

This opens `http://localhost:3000` where you can preview your changes.

#### Step 6: Commit Your Changes

```bash
git add .
git commit -m "Fix typo in forging guide"
```

**Good commit message examples:**
- `Fix typo in forging section`
- `Add Neptune's Trident item data`
- `Improve training calculator layout`
- `Update dungeon rewards for Africa`

#### Step 7: Push to Your Fork

```bash
git push origin fix/typo-in-forging-guide
```

#### Step 8: Open a Pull Request

1. Go to your fork on GitHub
2. Click **"Compare & pull request"**
3. Fill in the PR template:
   - **Title**: Brief description of your change
   - **Description**: What you changed and why
   - **Screenshots**: If you changed UI/styling (optional)
4. Click **"Create pull request"**

#### Step 9: Wait for Review

A maintainer will review your PR and either:
- Approve and merge it ✅
- Request changes 🔄
- Provide feedback 💬

Don't worry if changes are requested - this is normal and helps improve the contribution!

---

### For Contributors With Write Access

If you're a team member with write access:

1. Clone the repository directly (no fork needed)
2. Create a branch
3. Make your changes
4. Push the branch to the main repository
5. Open a Pull Request from your branch to `main`

**Important:** Direct pushes to `main` are **disabled**. All changes must go through Pull Requests for review.

---

## 📁 Project Structure

Understanding the project structure helps you find what you need to edit:

```
gladiatus-fansite/
├── docs/                   # Documentation pages
│   ├── index.md           # Homepage
│   ├── calculator.mdx     # Calculator page
│   ├── items/             # Item guides
│   ├── dungeons/          # Dungeon guides
│   ├── forging/           # Forging guides
│   └── events/            # Event guides
│
├── src/
│   ├── components/        # React components
│   │   ├── ItemTooltip.jsx
│   │   ├── TrainingCalculator.jsx
│   │   └── ...
│   ├── css/              # Custom styles
│   └── pages/            # Custom pages
│
├── static/
│   ├── data/             # JSON data files
│   │   └── items/        # Item database
│   └── img/              # Images and icons
│
├── blog/                  # Blog posts
├── docusaurus.config.ts   # Site configuration
├── sidebars.ts           # Sidebar navigation
└── package.json          # Dependencies
```

### Common Editing Scenarios

**Fixing a typo in a guide:**
- Edit files in `docs/` folder
- Example: `docs/forging/general/index.md`

**Adding item data:**
- Edit JSON files in `static/data/items/`
- Example: `static/data/items/swords.json`

**Updating a calculator:**
- Edit React component in `src/components/`
- Example: `src/components/TrainingCalculator.jsx`

**Adding an image:**
- Place image in `static/img/`
- Reference as `/img/your-image.png`

---

## 💻 Local Development Setup

### Prerequisites

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)
- **Git**

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/Djongov/gladiatus-fansite.git
cd gladiatus-fansite
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm start
```

This command starts a local development server and opens your browser to `http://localhost:3000`. Most changes are reflected live without having to restart the server.

4. **Build for production (optional)**
```bash
npm run build
```

This command generates static content into the `build` directory that can be served by any static hosting service.

### Useful Commands

```bash
npm start              # Start development server
npm run build         # Build for production
npm run serve         # Preview production build
npm run clear         # Clear cache
npm run typecheck     # Check TypeScript types
```

---

## 📝 Writing Guidelines

### Documentation Style

- **Be clear and concise** - Avoid jargon when possible
- **Use examples** - Show, don't just tell
- **Add screenshots** - Visual aids help understanding
- **Break up text** - Use headings, lists, and paragraphs
- **Check spelling** - Proofread before submitting

### Markdown Tips

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*

- Bullet point
- Another point

1. Numbered list
2. Another item

[Link text](https://example.com)

![Alt text for image](/img/example.png)

`inline code`

\`\`\`javascript
// Code block
const example = "hello";
\`\`\`
```

### Code Style

If you're editing JavaScript/TypeScript files:

- Use **2 spaces** for indentation
- Add **comments** for complex logic
- Follow existing code patterns
- Keep functions small and focused

---

## ✅ Pull Request Checklist

Before submitting your PR, make sure:

- [ ] Your code/content follows the project style
- [ ] You've tested your changes (if applicable)
- [ ] You've updated relevant documentation
- [ ] Your commit messages are clear
- [ ] You've described what and why in the PR description
- [ ] You've added screenshots for UI changes (if applicable)

---

## 🐛 Reporting Bugs

Found a bug? Help us fix it!

### Where to Report

- **GitHub Issues**: [Create an issue](https://github.com/Djongov/gladiatus-fansite/issues/new)

### What to Include

1. **Clear title** - Summarize the bug
2. **Steps to reproduce** - How can we trigger the bug?
3. **Expected behavior** - What should happen?
4. **Actual behavior** - What actually happens?
5. **Screenshots** - If applicable
6. **Browser/OS** - Your environment details

**Example:**
```
Title: Training calculator shows wrong gold cost

Steps to reproduce:
1. Go to Calculator page
2. Set Strength from 5 to 10
3. Set Training Grounds to level 10
4. Click Calculate

Expected: Cost should be 400 gold
Actual: Cost shows 500 gold
Browser: Chrome 120, Windows 11
```

---

## 💡 Suggesting Features

Have an idea? We'd love to hear it!

### Before Suggesting

1. Check [existing issues](https://github.com/Djongov/gladiatus-fansite/issues) - maybe someone already suggested it
2. Check if it aligns with the project goals - game-related tools and information

### How to Suggest

1. Open a [GitHub Issue](https://github.com/Djongov/gladiatus-fansite/issues/new)
2. Use a clear title: "Feature: Add expedition rewards calculator"
3. Describe:
   - **What** you want to add
   - **Why** it would be useful
   - **How** it might work (if you have ideas)

---

## 🤝 Getting Help

Need help contributing? Here's how to get assistance:

- **GitHub Discussions** - Ask questions, share ideas
- **GitHub Issues** - Technical problems or bugs
- **Pull Request Comments** - Get feedback on your contribution

Don't be shy! We're here to help and want you to succeed.

---

## 📜 Code of Conduct

Be respectful and constructive:

- ✅ Be welcoming to newcomers
- ✅ Provide constructive feedback
- ✅ Focus on the issue, not the person
- ✅ Accept feedback gracefully
- ❌ Don't be rude or dismissive
- ❌ Don't spam or self-promote

---

## 🎉 Recognition

Contributors are valued! All contributors are:

- Listed in the project's contributor list
- Credited in release notes (for significant contributions)
- Part of making Gladiatus Fansite better for everyone

---

## 📚 Additional Resources

### Learning Resources

- [GitHub's First Contributions Guide](https://github.com/firstcontributions/first-contributions)
- [How to Write a Git Commit Message](https://chris.beams.io/posts/git-commit/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Docusaurus Documentation](https://docusaurus.io/docs)

### Project-Specific

- [Repository](https://github.com/Djongov/gladiatus-fansite)
- [Live Website](https://gladiatus.djservers.com)
- [Issues](https://github.com/Djongov/gladiatus-fansite/issues)

---

## ❓ Frequently Asked Questions

**Q: Do I need to know how to code to contribute?**  
A: No! Fixing typos, improving documentation, and reporting bugs are all valuable contributions.

**Q: How long does it take for my PR to be reviewed?**  
A: Usually within a few days, but it depends on the maintainers' availability. Be patient!

**Q: Can I work on multiple changes at once?**  
A: Yes, but create a separate branch and PR for each change. This makes review easier.

**Q: I made a mistake in my PR. What do I do?**  
A: No problem! Just push new commits to the same branch. The PR will update automatically.

**Q: My PR was rejected. What now?**  
A: Don't be discouraged! Read the feedback, make adjustments, and try again. Or try a different contribution.

**Q: How do I keep my fork up to date?**  
A:

```bash
git remote add upstream https://github.com/Djongov/gladiatus-fansite.git
git fetch upstream
git checkout main
git merge upstream/main
```

---

Thank you for contributing to Gladiatus Fansite! Your efforts help make this resource better for the entire Gladiatus community. 🎮⚔️

This article is generated by the gracious help of Claude Sonnet 4.5
