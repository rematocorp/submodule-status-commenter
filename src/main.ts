import moment from 'moment'

import { exec } from './bash'
import {
	createPullRequestComment,
	getPullRequestComments,
	getPullRequestsByBranchName,
	updatePullRequestComment,
} from './githubRequests'

export async function run() {
	const paths: string = await exec("git config --file .gitmodules --get-regexp path | awk '{print $2}'")

	const messages = await Promise.all(
		paths.split('\n').map(async (path) => {
			await exec(`git -C ${path} fetch --depth=100 origin main`)
			await exec(`git -C ${path} fetch --depth=100 origin +refs/heads/*:refs/remotes/origin/*`)

			const submoduleName = await exec(`basename $(git -C ${path} rev-parse --show-toplevel)`)
			const bulletPoints = await getBulletPoints(path)

			return [`**Submodule "${submoduleName}" status**`, bulletPoints].join('\n\n')
		}),
	)

	await comment(messages.join('\n'))
}

async function getBulletPoints(path: string) {
	const commitHash = await exec(`git -C ${path} rev-parse HEAD`)
	const submoduleUrl = (await exec(`git -C ${path} config --get remote.origin.url`)).replace('.git', '')
	const branch = await getBranchName(path)
	const behind = await getBehind(path, commitHash)
	const ahead = await exec(`git -C ${path} rev-list --count origin/main..HEAD`)
	const pr = await getPullRequest(branch, submoduleUrl)
	const lastCommit = await getLastCommit(path)

	return [
		`- **[Current branch](${submoduleUrl}/tree/${commitHash})**: ${branch}`,
		`- **Behind main**: ${behind}`,
		`- **Ahead main**: ${ahead}`,
		pr && `- **[Pull request](${pr.html_url})**: ${pr.title}`,
		`- **[Last commit](${submoduleUrl}/commit/${commitHash})**: *${lastCommit}*`,
	]
		.filter((p) => p)
		.join('\n')
}

async function getBranchName(path: string) {
	let branchName: string = await exec(`git -C ${path} branch --contains HEAD --all --no-color`)

	// Filter out remote branches and HEAD entry, prioritize local branches
	const branches = branchName
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length && !line.startsWith('remotes/') && !line.includes('* (HEAD detached at'))
		.map((line) => line.replace(/^\* /, ''))

	if (branches.length > 0) {
		// Return the first local branch name if available
		branchName = branches[0]
	} else {
		// Fallback to a more descriptive state if no local branch is found
		branchName = await exec(`git -C ${path} name-rev --name-only HEAD`)
	}

	return branchName
		.replace('remotes/origin/', '')
		.replace(/[\^~].*/, '')
		.trim()
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

async function getPullRequest(branch: string, submoduleUrl: string) {
	return getSubmodulePullRequestByBranchName(branch, submoduleUrl)
}

async function getSubmodulePullRequestByBranchName(branchName: string, submoduleUrl: string) {
	const match = submoduleUrl.match(/https:\/\/[^\/]+\/([^\/]+)\/([^\.]+)/) || []
	const owner = match[1]
	const repo = match[2]

	const pullRequests = await getPullRequestsByBranchName(owner, repo, branchName)

	return pullRequests.length ? pullRequests[0] : null
}

async function getLastCommit(path: string) {
	const submodule =
		await exec(`git -C ${path} remote get-url origin | sed -e 's|.*://github.com/||' -e 's|.*:||' -e 's|\.git$||'
	`)
	const author = await exec(`git -C ${path} log -1 --pretty=%an`)
	const message = await exec(`git -C ${path} log -1 --pretty=format:%s`)
	const formattedMessage = message
		.trim()
		.substring(0, 50)
		.replace('Merge pull request #', `Merge pull request ${submodule}#`)

	return `"${formattedMessage.trim().substring(0, submodule.length + 50)}" by ${author.trim()}`
}

async function comment(commentBody: string) {
	const comments = await getPullRequestComments()
	const existingComment = comments.find((comment: any) => /Submodule ".*" status/.test(comment.body || ''))

	if (existingComment) {
		await updatePullRequestComment(existingComment.id, commentBody)
	} else {
		await createPullRequestComment(commentBody)
	}
}
