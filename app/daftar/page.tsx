import { register } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Daftar" };

export default function DaftarPage() {
  return (
    <div className="mx-auto max-w-sm py-12">
      <h1 className="mb-6 text-2xl font-semibold">Buat akun</h1>
      <AuthForm mode="register" action={register} />
    </div>
  );
}