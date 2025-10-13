## Zed currently has limited built‑in file diffing.

### Markdown heading styles {#identifier .heading3}
#### Markdown heading styles {#identifier .heading4}

### Options:

  - Use Git (recommended): initialize a repo so you get diffs, history and editor integrations:
      ```bash
      git init
      git add .
      git commit -m "initial"
      After edits: git diff README.md
      ```
      &emsp;

    - Use an external diff tool from shell:
        ```bash
        diff -u oldfile newfile
        colordiff for colored output
        For a GUI: meld, kdiff3, Beyond Compare, or VS Code's "code --diff a b"
        ```
        &nbsp;

    - Quick local workflow without Git:
        Make a before copy and run remark, then show diff:
        ```bash
        cp README.md README.md.bak && npx remark README.md -o && diff -u README.md.bak README.md | less -R
        ```
        &ensp;

    - Use Zed extension approach:
        There’s no official file-diff extension marketplace yet; you can run a tiny extension that invokes an external diff and opens results in a panel or prints to console. I can sketch that if you want.
