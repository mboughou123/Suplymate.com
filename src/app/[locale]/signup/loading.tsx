import AuthFormSkeleton from "@/components/AuthFormSkeleton";

// Signup collects name, company, email and password.
export default function SignupLoading() {
  return <AuthFormSkeleton fields={4} />;
}
