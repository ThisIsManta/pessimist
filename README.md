This is a Node.js library that helps derive `process.argv` array into a flexible, value-strict, TypeScript-friendly object.

```js
import { parseArguments } from '@thisismanta/pessimist'

const { 
  count, dryRun, outputFile, 
  ...positionalArguments
} = parseArguments(
  process.argv.slice(2), 
  {
    // Define the default values
    count: 0,
    dryRun: false,
    outputFile: '',
    exclude: [],
  },
  {
    // Define the special treatments
    aliases: { d: 'dryRun' },
    exclusives: [['dryRun', 'outputFile']],
  }
)

for (const item of Array.from(positionalArguments)) {
  // Consume your positional argument here
}
```

```sh
--count=3 -d --output-file-name=file3 file1 file2 
```

```js
{
  // From the named arguments
  count: 3,
  dryRun: true,
  outputFile: 'file3',

  // From the positional arguments
  '0': 'file1', 
  '1': 'file2',
  length: 2,

  // From the default values
  exclude: [],
}
```

## Rejecting unknown inputs

The below command argument exits with **non-zero code** because `somethingElse` is **not defined** in the default object (the second parameter of `parseArguments` function).

```sh
--something-else
# Error: Unexpected an unknown argument: --something-else
```

Therefore it is **important** to have all the possible field-value arguments defined in the default object.

## Auto converting argument names from _dash-case_ to _camelCase_

The below command arguments are the same because `dry-run` is transformed into a camel case.

```sh
--dryRun  # { dryRun: true }
--dry-run # { dryRun: true }
```

## Auto converting false-like values

```sh
--dryRun=false # { dryRun: false }
--dryRun=False
--dryRun=FALSE
--dryRun=n
--dryRun=no
--dryRun=0
```

## Supporting `no` name prefix

Having `no` argument prefix negates the Boolean value.

```sh
--noDryRun         # { dryRun: false }
--no-dry-run       # { dryRun: false }
--no-dry-run=false # { dryRun: true }
```

Having `no` argument prefix clears the string value.

```sh
--noOutputFile    # { outputFile: '' }
--no-output-file  # { outputFile: '' }
```

Having `no` argument prefix for an array removes the given value from the output array.

```sh
--exclude=file1 --exclude=file2 --no-exclude=file1
# { exclude: ['file2'] }
```

## Auto removing duplicate values

```sh
--exclude=file1 --exclude=file2 --exclude=file1
# { input: ['file2', 'file1'] }
```

Note that, unlike [`_.uniq([...])`](https://lodash.com/docs/4.17.15#uniq) and `new Set([...])`, the order is sorted where the most recent value will appear at the end of the array.

## Supporting name aliases

```js
parseArguments(
  process.argv.slice(2), 
  {
    dryRun: false
  },
  {
    aliases: {
      d: 'dryRun',
      commit: '!dryRun'
    }
  }
)
```

```sh
--dryRun # { dryRun: true }
-d       # { dryRun: true }
```

However, the below command arguments are the opposite because the `!` operator negates the value as defined in `commit` alias.

```sh
--commit    # { dryRun: false }
--noCommit  # { dryRun: true }
--no-commit # { dryRun: true }
```

## Supporting single-letter short-hand arguments

```js
parseArguments(
  process.argv.slice(2), 
  {
    verbose: false,
    f: false,
  },
  {
    aliases: {
      v: 'verbose',
    }
  }
)
```

```sh
-vf # { verbose: true, f: true }
```

## Rejecting mutual exclusive names

```js
parseArguments(
  process.argv.slice(2), 
  {
    dryRun: false,
    commit: true,
  },
  {
    exclusives: [['dryRun', 'commit'], ...],
  }
)
```

```sh
--dryRun --commit
# Error: Unexpected mutual exclusive arguments: --dryRun --commit
```
