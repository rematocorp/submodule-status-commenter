import eslintConfig from '@remato/eslint-config'

export default [
	...eslintConfig.configs['typescript'],
	{
		ignores: ['dist'],
		rules: {
			'no-console': 0,
		},
	},
]
