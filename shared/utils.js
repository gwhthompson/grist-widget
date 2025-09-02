export async function getCurrentUser () {
  const { baseUrl, token } = await grist.docApi.getAccessToken({ readOnly: true })
  return fetch(`${new URL(baseUrl).origin}/api/profile/user?auth=${token}`).then(r => r.json())
}

