import { Nav } from "@/components/nav";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav role="DOCTOR" />
      {children}
    </>
  );
}
