import { AuthForm } from "@/components/auth-form";
import { login } from "@/app/actions/auth";

export const metadata = { title: "Masuk" };

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="mb-6 text-2xl font-semibold">Masuk</h1>
      <AuthForm mode="login" action={login} next={next} />
    </div>
  );
}