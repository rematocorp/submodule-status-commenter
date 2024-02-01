import {
	createPullRequestComment,
	getPullRequestComments,
	getPullRequestsByBranchName,
	updatePullRequestComment,
} from './githubRequests'
import { exec } from './bash'

export async function run(path: string) {
	await exec(`git -C ${path} fetch --depth=50 origin +refs/heads/*:refs/remotes/origin/*`)

	const commitHash = await exec(`git -C ${path} rev-parse HEAD`)
	const branch = (await exec(`git -C ${path} name-rev --name-only HEAD`)).replace('remotes/origin/', '')
	const behind = await exec(`git -C ${path} rev-list --count HEAD..origin/main`)
	const ahead = await exec(`git -C ${path} rev-list --count origin/main..HEAD`)
	const submoduleName = await exec(`basename $(git -C ${path} rev-parse --show-toplevel)`)
	const submoduleUrl = await exec(`git -C ${path} config --get remote.origin.url`)
	const prUrl = await getSubmodulePullRequestByBranchName(branch, submoduleUrl)

	await comment(
		`**Submodule "${submoduleName}" status**

- Current branch: **${branch}**
- Commits behind main: **${behind}**
- Commits ahead main: **${ahead}**

[View exact state](${submoduleUrl}/tree/${commitHash}) ${prUrl ? '[View open PR](' + prUrl + ')' : ''}`,
		submoduleName,
	)
}

async function getSubmodulePullRequestByBranchName(branchName: string, submoduleUrl: string) {
	const match = submoduleUrl.match(/https:\/\/[^\/]+\/([^\/]+)\/([^\.]+)/) || []
	const owner = match[1]
	const repo = match[2]

	const pullRequests = await getPullRequestsByBranchName(owner, repo, branchName)

	return pullRequests.length ? pullRequests[0].html_url : null
}

async function comment(commentBody: string, submoduleName: string) {
	const comments = await getPullRequestComments()
	const existingComment = comments.find((comment) => comment.body?.includes(`Submodule "${submoduleName}" status`))

	if (existingComment) {
		await updatePullRequestComment(existingComment.id, commentBody)
	} else {
		await createPullRequestComment(commentBody)
	}
}
