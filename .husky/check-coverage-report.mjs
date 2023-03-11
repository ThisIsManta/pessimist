import coverageParser from '@connectis/coverage-parser'
import path from 'path'
import escapeRegExp from 'lodash/escapeRegExp.js'

const reports = await coverageParser.parseGlobs('coverage/lcov.info', { type: 'lcov' })

const rootDirectoryPattern = new RegExp('^' + escapeRegExp(process.cwd() + path.sep))

for (const report of reports) {
	if (
		report.lines.found !== report.lines.hit ||
		report.functions.found !== report.functions.hit ||
		report.branches.found !== report.branches.hit
	) {
		console.error()
		console.error('Expect test coverage to be 100% for ' + report.file.replace(rootDirectoryPattern, ''))
		console.error()

		process.exit(1)
	}
}
