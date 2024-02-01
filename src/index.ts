import { getInput } from '@actions/core'
import { Octokit } from '@octokit/rest'
import { getOctokit, context } from '@actions/github'
import { exec } from '@actions/exec'

async function run() {
	const githubToken = getInput('github-token', { required: true })
	const submodulePath = getInput('submodule-path', { required: true })
	const octokit = getOctokit(githubToken) as Octokit

	await exec('/bin/bash', ['-c', `cd ${submodulePath}`])
	await exec('/bin/bash', ['-c', 'git fetch origin'])

	const currentBranch = await exec('/bin/bash', ['-c', 'git rev-parse --abbrev-ref HEAD']).toString().trim()

	const behind = await exec('/bin/bash', ['-c', 'git rev-list --count HEAD..origin/main']).toString().trim()
	const ahead = await exec('/bin/bash', ['-c', 'git rev-list --count origin/main..HEAD']).toString().trim()

	const commentBody = `The submodule is currently on the "${currentBranch}" branch, which is ${behind} commits behind and ${ahead} commits ahead of the "main" branch.`

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
