import {
	createPullRequestComment,
	getPullRequestComments,
	getPullRequestsByBranchName,
	updatePullRequestComment,
} from './githubRequests'
import { exec } from './bash'
import moment from 'moment'

export async function run(path: string) {
	await exec(`git -C ${path} fetch --depth=50 origin +refs/heads/*:refs/remotes/origin/*`)

	const commitHash = await exec(`git -C ${path} rev-parse HEAD`)
	const branch = (await exec(`git -C ${path} name-rev --name-only HEAD`)).replace('remotes/origin/', '')
	const behind = await getBehind(path, commitHash)
	const ahead = await exec(`git -C ${path} rev-list --count origin/main..HEAD`)
	const submoduleName = await exec(`basename $(git -C ${path} rev-parse --show-toplevel)`)
	const lastCommit = await getLastCommit(path)
	const links = await getLinks(path, commitHash, branch)

	await comment(
		submoduleName,
		`**Submodule "${submoduleName}" status**

- Current branch: **${branch}**
- Behind main: **${behind}**
- Ahead main: **${ahead}**
- Last commit: **${lastCommit}**

${links}`,
	)
}

async function getBehind(path: string, commitHash: string) {
	const behind = await exec(`git -C ${path} rev-list --count HEAD..origin/main`)
	const behindTime = Number(behind) ? await getBehindTime(path, commitHash) : ''

	return behind + (behindTime ? ` (${behindTime})` : '')
}

async function getBehindTime(path: string, commitHash: string) {
	const currentCommitDate = await exec(`git -C ${path} show -s --format=%ci ${commitHash}`)
	const latestMainCommitDate = await exec(`git -C ${path} show -s --format=%ci origin/main`)

	const currentCommitMoment = moment(new Date(currentCommitDate.trim()))
	const latestMainCommitMoment = moment(new Date(latestMainCommitDate.trim()))

	const timeDiff = moment.duration(currentCommitMoment.diff(latestMainCommitMoment))

	return timeDiff.humanize()
}

async function getLastCommit(path: string) {
	const lastCommitMessage = await exec(`git -C ${path} log -1 --pretty=format:%s`)
	const lastCommitAuthor = await exec(`git -C ${path} log -1 --pretty=%an`)

	return `"${lastCommitMessage.trim().substring(0, 72)}" by ${lastCommitAuthor.trim()}`
}

async function getLinks(path: string, commitHash: string, branch: string) {
	const submoduleUrl = (await exec(`git -C ${path} config --get remote.origin.url`)).replace('.git', '')

	const exactStateLink = getExactStateLink(submoduleUrl, commitHash)
	const prLink = await getSubmodulePullRequestLink(branch, submoduleUrl)
	const lastCommitLink = getLastCommitLink(submoduleUrl, commitHash)

	return [exactStateLink, prLink, lastCommitLink].filter((link) => link).join(' — ')
}

function getExactStateLink(submoduleUrl: string, commitHash: string) {
	return `[View exact state](${submoduleUrl}/tree/${commitHash})`
}

async function getSubmodulePullRequestLink(branch: string, submoduleUrl: string) {
	const pr = await getSubmodulePullRequestByBranchName(branch, submoduleUrl)

	console.log('PR debug', pr, branch, submoduleUrl)

	return pr ? `[View ${pr.state} PR](${pr.html_url})` : ''
}

async function getSubmodulePullRequestByBranchName(branchName: string, submoduleUrl: string) {
	const match = submoduleUrl.match(/https:\/\/[^\/]+\/([^\/]+)\/([^\.]+)/) || []
	const owner = match[1]
	const repo = match[2]

	const pullRequests = await getPullRequestsByBranchName(owner, repo, branchName)

	return pullRequests.length ? pullRequests[0] : null
}

function getLastCommitLink(submoduleUrl: string, commitHash: string) {
	return `[View last commit](${submoduleUrl}/commit/${commitHash})`
}

async function comment(submoduleName: string, commentBody: string) {
	const comments = await getPullRequestComments()
	const existingComment = comments.find((comment) => comment.body?.includes(`Submodule "${submoduleName}" status`))

	if (existingComment) {
		await updatePullRequestComment(existingComment.id, commentBody)
	} else {
		await createPullRequestComment(commentBody)
	}
}
