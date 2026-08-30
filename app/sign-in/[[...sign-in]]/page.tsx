import { SignIn } from "@clerk/nextjs";
import { glassPanel } from "@/lib/ui";

export default function SignInPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className={`${glassPanel} p-6`}>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}
