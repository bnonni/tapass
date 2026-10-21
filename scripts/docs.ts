// Write the docs/api pages from the JSDoc of the methods in src.
//
// Usage:
//   bun scripts/docs.ts           Write the docs/api pages
//   bun scripts/docs.ts --check   Exit with code 1 if a page is not current
//
// The JSDoc in src is the source of truth. The examples are only in the
// pages, so the script keeps the example of each method from its page.
import {existsSync} from 'node:fs';
import {readdirSync} from 'node:fs';
import {readFileSync} from 'node:fs';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';

type Group = {
  /** Page File Name */
  file: string;
  /** Page Introduction */
  intro: string;
  /** Page Title */
  title: string;
};

type Method = {
  /** Method JSDoc Without the Comment Marks */
  doc: string;
  /** Method Name */
  name: string;
};

const apiDir = join(import.meta.dirname, '..', 'docs', 'api');
const daemon = 'tapd';
const exportPattern = /export \{default as (\w+)\} from '\.\/(\w+)\.js'/g;
const isCheck = process.argv.includes('--check');
const methodsDir = join(import.meta.dirname, '..', 'src', 'tapd_methods');

// Each folder of methods has a page, in this order
const groups: Record<string, Group> = {
  address: {
    file: 'addresses.md',
    intro:
      'Taproot Assets addresses, and the inbound transfers to these addresses.',
    title: 'Addresses',
  },
  assets: {
    file: 'assets.md',
    intro:
      'The assets, balances, asset groups, metadata, outputs, and burns of the node.',
    title: 'Assets',
  },
  channels: {
    file: 'asset-channels.md',
    intro:
      'Channels that are funded with an asset, and the invoices and payments over these channels.',
    title: 'Asset Channels',
  },
  daemon: {
    file: 'daemon.md',
    intro:
      'These methods make tapd macaroons, set the log level, and stop tapd.',
    title: 'Daemon',
  },
  info: {
    file: 'info.md',
    intro: 'Information about tapd and its lnd node.',
    title: 'Info',
  },
  mint: {
    file: 'mint.md',
    intro:
      'tapd mints assets in batches. Add assets to the pending batch, then fund, seal, and finalize the batch.',
    title: 'Mint',
  },
  proofs: {
    file: 'proofs.md',
    intro: 'Decode, export, unpack, and verify asset proofs.',
    title: 'Proofs',
  },
  rfq: {
    file: 'rfq.md',
    intro:
      'Request for quote (RFQ): the offers, orders, and quotes that set the asset price of a payment over an asset channel.',
    title: 'RFQ',
  },
  send: {
    file: 'send.md',
    intro: 'On-chain asset sends, transfers, and burns.',
    title: 'Send',
  },
};

// Remove the common indent of the lines
const dedent = (lines: string[]) => {
  const indents = lines
    .filter(line => !!line.trim())
    .map(line => line.length - line.trimStart().length);

  const indent = Math.min(...indents);

  return lines.map(line => line.slice(indent));
};

// Get the JSDoc of each method that the index of a group exports
const methodsOf = (group: string): Method[] => {
  const dir = join(methodsDir, group);
  const index = readFileSync(join(dir, 'index.ts'), 'utf8');

  return [...index.matchAll(exportPattern)].map(([, name, base]) => {
    const file = join(dir, `${base}.ts`);
    const src = readFileSync(file, 'utf8');

    // A method is a typed const, a subscription is the default export
    const typed = src.indexOf(`const ${name}:`);
    const at = typed >= 0 ? typed : src.indexOf('export default (');

    const before = src.slice(0, Math.max(at, 0));
    const start = before.lastIndexOf('/** ');
    const end = before.lastIndexOf('*/');

    if (at < 0 || start < 0 || end < start) {
      throw new Error(`Expected a JSDoc before ${name} in ${file}`);
    }

    const [summary = '', ...rest] = before
      .slice(start + '/** '.length, end)
      .trimEnd()
      .split('\n');

    return {name, doc: [summary, ...dedent(rest)].join('\n').trimEnd()};
  });
};

// Get the example of each method on a page
const examplesOf = (page: string) => {
  const examples = new Map<string, string>();

  page
    .split(/^## /m)
    .slice(1)
    .forEach(section => {
      const [name = '', ...lines] = section.split('\n');
      const [, example] = lines.join('\n').split(/^Example:$/m);

      if (example !== undefined) {
        examples.set(name.trim(), example.trim());
      }
    });

  return examples;
};

// The prose of the JSDoc, then the arguments and the results as code
const sectionOf = ({doc, name}: Method, example: string) => {
  const [summary = '', ...lines] = doc.split('\n');
  const code = lines.findIndex(line => /^[{@]/.test(line));

  if (code < 0) {
    throw new Error(`Expected arguments in the JSDoc of ${name}`);
  }

  const body = [
    ...lines.slice(0, code),
    ...lines.slice(code).map(line => (!line.trim() ? '' : `    ${line}`)),
  ];

  return [
    `## ${name}`,
    '',
    summary,
    '',
    body.join('\n').trim(),
    '',
    'Example:',
    '',
    example,
    '',
  ];
};

const byName = (a: Method, b: Method) =>
  a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
const summaryOf = (doc: string) => doc.split('\n')[0];

const pages = new Map<string, string>();

const index = [
  '# API',
  '',
  `Each method takes a \`${daemon}\` object. Refer to [Authentication](../authentication.md). Each method returns a Promise, or calls a callback if you give one. Refer to [Usage](../usage.md).`,
  '',
];

Object.entries(groups).forEach(([group, {file, intro, title}]) => {
  const path = join(apiDir, file);
  const examples = examplesOf(
    existsSync(path) ? readFileSync(path, 'utf8') : '',
  );
  const methods = methodsOf(group).sort(byName);

  const page = [`# ${title}`, '', intro, ''];

  index.push(`## [${title}](${file})`, '', intro, '');

  methods.forEach(({doc, name}) => {
    const anchor = name.toLowerCase();

    index.push(`- [${name}](${file}#${anchor}): ${summaryOf(doc)}`);
    page.push(`- [${name}](#${anchor}): ${summaryOf(doc)}`);
  });

  index.push('');
  page.push('');

  methods.forEach(method => {
    const example = examples.get(method.name);

    // A new method needs an example before the script can write its section
    if (!example) {
      throw new Error(
        `Expected an example for ${method.name}. Add "## ${method.name}" ` +
          `with "Example:" and a code block to docs/api/${file}.`,
      );
    }

    page.push(...sectionOf(method, example));
  });

  pages.set(file, `${page.join('\n').trim()}\n`);
});

pages.set('README.md', `${index.join('\n').trim()}\n`);

// Each folder of methods must have a page
readdirSync(methodsDir, {withFileTypes: true})
  .filter(entry => entry.isDirectory() && !groups[entry.name])
  .forEach(entry => {
    throw new Error(`Expected a page in the groups for ${entry.name}`);
  });

const stale = [...pages].filter(([file, page]) => {
  const path = join(apiDir, file);

  return !existsSync(path) || readFileSync(path, 'utf8') !== page;
});

const extra = readdirSync(apiDir).filter(file => !pages.has(file));

if (isCheck) {
  stale.forEach(([file]) => console.error(`Not current: docs/api/${file}`));
  extra.forEach(file => console.error(`Not generated: docs/api/${file}`));

  if (!!stale.length || !!extra.length) {
    console.error('Run `pnpm docs` to write the docs/api pages.');

    process.exit(1);
  }
} else {
  stale.forEach(([file, page]) => writeFileSync(join(apiDir, file), page));
  extra.forEach(file => console.error(`Not generated: docs/api/${file}`));
}

console.log(`docs/api: ${pages.size} pages, ${stale.length} changed`);
