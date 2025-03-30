# Setup Remote Repository

To connect this local repository to a remote repository, follow these steps:

## Option 1: GitHub

1. Create a new repository on GitHub (without initializing with README, .gitignore, or license)
2. Copy the repository URL (HTTPS or SSH)
3. Run the following commands:

```bash
git remote add origin <repository-URL>
git push -u origin master
```

## Option 2: Other Git Providers (GitLab, Bitbucket, etc.)

1. Create a new repository on your preferred Git provider
2. Copy the repository URL
3. Run the following commands:

```bash
git remote add origin <repository-URL>
git push -u origin master
```

## Verify Remote Connection

```bash
git remote -v
```

This should display the remote repository URL for fetch and push operations.

## Summary of Changes Made

1. Fixed dependency issues:
   - Added `lovable-tagger` package required by vite.config.ts
   - Added `dotenv` package required by src/lib/env.ts
   
2. Updated package.json to include the new dependencies

3. Added .gitignore to exclude unnecessary files

4. Added detailed README.md with setup and running instructions

The project should now run correctly with `npm run dev` command. 