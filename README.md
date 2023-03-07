```ts
import { parseArguments } from '@thisismanta/pessimist'

const args = parseArguments(
    process.argv.slice(2), 
    { dryRun: false, count: 0, inputs: [], output: '' }
)
```

```sh
node myfile --dryRun file1 file2
```

The above command yields `args` of the following type.

```ts
{
    // From the formal arguments
    dryRun: true,

    // From the defaults
    count: 0,
    inputs: [],
    output: '',

    // From the actual arguments
    '0': 'file1', 
    '1': 'file2',
    length: 2,
}
```

### Unknown name rejection

The below commands exit with non-zero code as `xxx` is not in the default object (the second parameter of `parseArguments` function).

Therefore it is important to have all the possible names and values defined as the default object.

```sh
node myfile --xxx
```

### Auto camel case conversion

The below commands yield the same output as `dry-run` is transformed into a camel case.

```sh
node myfile --dryRun
node myfile --dry-run
```

### False-like Boolean recognition

The below commands yield the same output.

```sh
node myfile --dryRun=false
node myfile --dryRun=False
node myfile --dryRun=FALSE
node myfile --dryRun=n
node myfile --dryRun=no
node myfile --dryRun=0
```

### Negation and clearance

The below commands yield `dryRun === false` as `no` prefix negates the Boolean value.

```sh
node myfile --noDryRun
node myfile --no-dry-run
```

The below commands yield `output === ''` as `no` prefix sets the value to an empty string.

```sh
node myfile --noOutput
node myfile --no-output
```

The below commands yield `input == []` as `no` prefix sets the value to an empty array.

```sh
node myfile --noInputs
node myfile --no-inputs
```

### Duplicate-free guarantee

The below commands yield `input == ['file2', 'file1']` as it does not keep the duplicate values.

```sh
node myfile --inputs=file1 --inputs=file2 --inputs=file1
```
