```ts
import { parseArguments } from '@thisismanta/pessimist'

const { count, dryRun, outputFileName, ...positionalArguments } =
parseArguments(
  process.argv.slice(2), 
  {
    count: 0,
    dryRun: false,
    outputFileName: '',
    exclude: [],
  }
)

for (const item of Array.from(positionalArguments)) {
  // ...
}
```

```
file1 file2 --count=3 --output-file-name=file3
```

```ts
{
  // From the positional arguments
  '0': 'file1', 
  '1': 'file2',
  length: 2,

  // From the named arguments
  outputFileName: 'file3',
  dryRun: true,

  // From the defaults
  count: 0,
  exclude: [],
}
```

### Unknown field rejection

The below commands exit with non-zero code as `somethingElse` is **not defined** in the default object (the second parameter of `parseArguments` function).

```sh
--something-else
# Error: Unexpected an unknown argument: --something-else
```

Therefore it is **important** to have all the possible field-value arguments defined in the default object.

### Auto camel-case conversion

The below commands yield the same output because `dry-run` is transformed into a camel case.

```sh
--dryRun  # { dryRun: true }
--dry-run # { dryRun: true }
```

### False-like Boolean recognition

The below commands yield the same output.

```sh
--dryRun=false # { dryRun: false }
--dryRun=False
--dryRun=FALSE
--dryRun=n
--dryRun=no
--dryRun=0
```

### Negation and clearance

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

### Duplicate-free guarantee

```sh
--exclude=file1 --exclude=file2 --exclude=file1
# { input: ['file2', 'file1'] }
```

### Field aliases

```ts
parseArguments(
  process.argv.slice(2), 
  { dryRun: false },
  { aliases: { d: 'dryRun', commit: '!dryRun' } }
)
```

```sh
node myfile --dryRun # { dryRun: true }
node myfile -d       # { dryRun: true }
```

However, the below commands yield the opposite outputs because `!` prefix negates the value from `commit`.

```sh
node myfile --commit    # { dryRun: false }
node myfile --noCommit  # { dryRun: true }
node myfile --no-commit # { dryRun: true }
```

### Mutual exclusive fields

```ts
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
