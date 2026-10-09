import LoginForm from './LoginForm'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string }
}) {
  return <LoginForm redirectTo={searchParams.from ?? '/'} />
}
