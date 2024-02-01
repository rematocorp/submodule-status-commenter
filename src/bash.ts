import { getExecOutput } from '@actions/exec'

export async function exec(command: string) {
	const { stdout } = await getExecOutput('/bin/bash', ['-c', command])

	return stdout.trim()
}
