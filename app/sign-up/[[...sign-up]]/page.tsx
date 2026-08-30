import { SignUp } from "@clerk/nextjs";
import { glassPanel } from "@/lib/ui";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className={`${glassPanel} p-6`}>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
