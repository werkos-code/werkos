import Image from "next/image";

import { LoginCard } from "@/features/auth/components/login-card";
import { siteConfig } from "@/config/site";

const LOGIN_BACKGROUND = {
  src: "/auth/login-background.jpg",
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
        quality={90}
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-[#09133A]/45" />

      <div className="relative z-10 flex w-full justify-center">{children}</div>
    </div>
  );
}

export function LoginPageContent() {
  return (
    <LoginShell>
      <div className="flex w-full max-w-[32rem] flex-col items-center">
        <a
          href={siteConfig.marketingUrl}
          className="mb-8 transition-opacity hover:opacity-90 sm:mb-10"
          aria-label={siteConfig.name}
        >
          <Image
            src="/brand/logo-white.svg"
            alt={siteConfig.name}
            width={697}
            height={147}
            priority
            className="h-8 w-auto sm:h-9"
          />
        </a>
        <LoginCard />
      </div>
    </LoginShell>
  );
}
