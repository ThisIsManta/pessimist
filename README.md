This is a Node.js library that helps derive `process.argv` array into a flexible, value-strict, TypeScript-friendly object.

```js
import { parseArguments } from '@thisismanta/pessimist'

const { 
  count, dryRun, outputFileName, 
  ...positionalArguments
} = parseArguments(
  process.argv.slice(2), 
  {
    // Define the default values
    count: 0,
    dryRun: false,
    outputFileName: '',
    exclude: [],
  },
  {
    // Define the special treatments
    aliases: { d: 'dryRun' },
    exclusives: [['dryRun', 'outputFileName']],
  }
)

for (const item of Array.from(positionalArguments)) {
  // Consume your positional argument here
}
```

```sh
file1 file2 --count=3 --output-file-name=file3
```

```js
{
  // From the named arguments
  outputFileName: 'file3',
  dryRun: true,

  // From the positional arguments
  '0': 'file1', 
  '1': 'file2',
  length: 2,

  // From the default values
  count: 0,
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
--noOutputFileName    # { outputFileName: '' }
--no-output-file-name # { outputFileName: '' }
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

## Rejecting mutual exclusive names

```js
parseArguments(
  process.argv.slice(2), 
  {
    dryRun: false,
    confirmed: true,
  },
  {
    exclusives: [['dryRun', 'confirmed'], ...],
  }
)
```

```sh
--dryRun --confirmed
# Error: Unexpected mutual exclusive arguments: --dryRun --confirmed
```
