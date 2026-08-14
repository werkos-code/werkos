import Image from "next/image";

import { LoginCard } from "@/features/auth/components/login-card";

const LOGIN_BACKGROUND = {
  src: "/auth/login-background.png",
  alt: "Rotterdam bij schemering",
} as const;

export function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8 sm:py-14">
      <Image
        src={LOGIN_BACKGROUND.src}
        alt={LOGIN_BACKGROUND.alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[#09133A]/45" />

      <div className="relative z-10 w-full flex justify-center">{children}</div>
    </div>
  );
}

export function LoginPageContent() {
  return (
    <LoginShell>
      <LoginCard />
    </LoginShell>
  );
}
