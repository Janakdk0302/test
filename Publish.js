#!/usr/bin/env node

import ghpages from 'gh-pages';
import { Command } from 'commander';
import path from 'path';
import { fileURLToPath } from 'url';
import addr from 'email-addresses';
import pkg from './package.json' assert { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function publish(dist, config) {
  return new Promise((resolve, reject) => {
    const basePath = path.resolve(process.cwd(), dist);
    ghpages.publish(basePath, config, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

async function main(args) {
  const program = new Command()
    .version(pkg.version)
    .requiredOption('-d, --dist <dist>', 'Base directory for all source files')
    .option('-s, --src <src>', 'Pattern used to select which files to publish', '**/*')
    .option('-b, --branch <branch>', 'Name of the branch you are pushing to', 'gh-pages')
    .option('-e, --dest <dest>', 'Target directory within the destination branch (relative to the root)', '.')
    .option('-a, --add', 'Only add, and never remove existing files')
    .option('-x, --silent', 'Do not output the repository URL')
    .option('-m, --message <message>', 'Commit message', 'Updates')
    .option('-g, --tag <tag>', 'Add tag to commit')
    .option('--git <git>', 'Path to git executable', 'git')
    .option('-t, --dotfiles', 'Include dotfiles')
    .option('--nojekyll', 'Add a .nojekyll file to disable Jekyll')
    .option('--cname <CNAME>', 'Add a CNAME file with the name of your custom domain')
    .option('-r, --repo <repo>', 'URL of the repository you are pushing to')
    .option('-p, --depth <depth>', 'Depth for clone', 1)
    .option('-o, --remote <name>', 'The name of the remote', 'origin')
    .option('-u, --user <address>', 'The name and email of the user (defaults to the git config). Format is "Your Name <email@example.com>".')
    .option('-v, --remove <pattern>', 'Remove files that match the given pattern (ignored if used together with --add).')
    .option('-n, --no-push', 'Commit only (with no push)')
    .option('-f, --no-history', 'Push force new commit without parent history')
    .option('--before-add <file>', 'Execute the function exported by <file> before "git add"')
    .parse(args);

  const options = program.opts();

  let user;
  if (options.user) {
    const parts = addr.parseOneAddress(options.user);
    if (!parts) {
      throw new Error(`Could not parse name and email from user option "${options.user}" (format should be "Your Name <email@example.com>")`);
    }
    user = { name: parts.name, email: parts.address };
  }

  let beforeAdd;
  if (options.beforeAdd) {
    const m = await import(path.resolve(process.cwd(), options.beforeAdd));
    if (typeof m === 'function') {
      beforeAdd = m;
    } else if (typeof m === 'object' && typeof m.default === 'function') {
      beforeAdd = m.default;
    } else {
      throw new Error(`Could not find function to execute before adding files in "${options.beforeAdd}".`);
    }
  }

  const config = {
    repo: options.repo,
    silent: !!options.silent,
    branch: options.branch,
    src: options.src,
    dest: options.dest,
    message: options.message,
    tag: options.tag,
    git: options.git,
    depth: options.depth,
    dotfiles: !!options.dotfiles,
    nojekyll: !!options.nojekyll,
    cname: options.cname,
    add: !!options.add,
    remove: options.remove,
    remote: options.remote,
    push: !options.noPush,
    history: !options.noHistory,
    user: user,
    beforeAdd: beforeAdd,
  };

  await publish(options.dist, config);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv)
    .then(() => {
      process.stdout.write('Published\n');
    })
    .catch((err) => {
      process.stderr.write(`${err.stack}\n`, () => process.exit(1));
    });
}

export default main;
