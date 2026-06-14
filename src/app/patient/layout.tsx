import { Nav } from "@/components/nav";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav role="PATIENT" />
      {children}
    </>
  );
}
