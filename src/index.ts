import { getInput } from '@actions/core'
import { Octokit } from '@octokit/rest'
import { getOctokit, context } from '@actions/github'
import { exec, getExecOutput } from '@actions/exec'

async function run() {
	const githubToken = getInput('github-token', { required: true })
	const submodulePath = getInput('submodule-path', { required: true })
	const octokit = getOctokit(githubToken) as Octokit

	await exec('/bin/bash', ['-c', `cd ${submodulePath} && git fetch origin main`])

	const currentBranch = await getSubmoduleBranchName(submodulePath)

	console.log('Current branch', currentBranch)

	const behindPromiseOutput = await getExecOutput('/bin/bash', [
		'-c',
		`cd ${submodulePath} && git rev-list --count HEAD..origin/main`,
	])
	const behind = behindPromiseOutput.stdout.trim()
	const aheadOutput = await getExecOutput('/bin/bash', [
		'-c',
		`cd ${submodulePath} && git rev-list --count origin/main..HEAD`,
	])
	const ahead = aheadOutput.stdout.trim()

	const commentBody = `The submodule is currently on the "${currentBranch}" branch, which is ${behind} commits behind and ${ahead} commits ahead of the "main" branch.`

	await findOrCreateComment(octokit, commentBody)
}

async function getSubmoduleBranchName(submodulePath: string) {
	await getExecOutput('/bin/bash', ['-c', `git -C ${submodulePath} fetch --all`])

	const { stdout } = await getExecOutput('/bin/bash', ['-c', `git -C ${submodulePath} branch -r --contains HEAD`])

	const branches = stdout
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.startsWith('origin/'))
		.map((line) => line.replace('origin/', ''))

	console.log('Branches', branches)

	const branchName = branches.find((branch) => !branch.includes('HEAD')) || 'unknown'

	return branchName
}

async function findOrCreateComment(octokit: Octokit, commentBody: string) {
	const { data: comments } = await octokit.rest.issues.listComments({
		...context.repo,
		issue_number: context.issue.number,
	})

	const existingComment = comments.find((comment) => comment.body?.includes('The submodule is currently on the'))

	if (existingComment) {
		await octokit.rest.issues.updateComment({
			...context.repo,
			comment_id: existingComment.id,
			body: commentBody,
		})
	} else {
		await octokit.rest.issues.createComment({
			...context.repo,
			issue_number: context.issue.number,
			body: commentBody,
		})
	}
}

run()
