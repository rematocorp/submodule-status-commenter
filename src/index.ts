import { getInput } from '@actions/core'
import { Octokit } from '@octokit/rest'
import { getOctokit, context } from '@actions/github'
import { exec, getExecOutput } from '@actions/exec'

async function run() {
	const githubToken = getInput('github-token', { required: true })
	const submodulePath = getInput('submodule-path', { required: true })
	const submoduleUrl = getInput('submodule-url', { required: true })
	const octokit = getOctokit(githubToken) as Octokit

	await exec('/bin/bash', ['-c', `git -C ${submodulePath} fetch origin main`])

	const currentBranchOutput = await getExecOutput('/bin/bash', [
		'-c',
		`git -C ${submodulePath} name-rev --name-only HEAD`,
	])
	const currentBranch = currentBranchOutput.stdout.trim()

	console.log('Current branch', currentBranch)

	const behindPromiseOutput = await getExecOutput('/bin/bash', [
		'-c',
		`git -C ${submodulePath} rev-list --count HEAD..origin/main`,
	])
	const behind = behindPromiseOutput.stdout.trim()
	const aheadOutput = await getExecOutput('/bin/bash', [
		'-c',
		`git -C ${submodulePath} rev-list --count origin/main..HEAD`,
	])
	const ahead = aheadOutput.stdout.trim()

	const currentCommitHashOutput = await getExecOutput('/bin/bash', ['-c', `git -C ${submodulePath} rev-parse HEAD`])
	const currentCommitHash = currentCommitHashOutput.stdout.trim()

	const commentBody = `**Submodule status**

	Current branch:      ${currentBranch}
	Commits behind main: ${behind}
	Commits ahead main:  ${ahead}

	[Open submodule](https://github.com/${submoduleUrl}/tree/${currentCommitHash}})`

	await findOrCreateComment(octokit, commentBody)
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
