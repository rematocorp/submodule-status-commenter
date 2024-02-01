import { getInput } from '@actions/core'
import { getOctokit, context } from '@actions/github'

const githubToken = getInput('github-token', { required: true })
const octokit = getOctokit(githubToken)

export async function getPullRequestsByBranchName(owner: string, repo: string, branchName: string) {
	const { data: pullRequests } = await octokit.rest.pulls.list({
		owner,
		repo,
		head: `${owner}:${branchName}`,
	})

	return pullRequests
}

export async function getPullRequestComments() {
	const { data: comments } = await octokit.rest.issues.listComments({
		...context.repo,
		issue_number: context.issue.number,
	})

	return comments
}

export async function updatePullRequestComment(commentId: number, body: string) {
	console.log('Updating PR comment')

	await octokit.rest.issues.updateComment({
		...context.repo,
		comment_id: commentId,
		body,
	})
}

export async function createPullRequestComment(body: string) {
	console.log('Creating PR comment')

	await octokit.rest.issues.createComment({
		...context.repo,
		issue_number: context.issue.number,
		body,
	})
}
