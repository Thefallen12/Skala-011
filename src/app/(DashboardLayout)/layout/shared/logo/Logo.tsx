'use client'

import Image from "next/image";
import Link from 'next/link';

const Logo = () => {
  return (
    <Link href={'/'}>
      <Image
        src={"/images/logos/icont%20logo%201.svg"}
        alt="Skala Prioritas Engineering"
        width={45}
        height={40}
        className="h-10 w-[45px] object-contain"
      />
    </Link>
  )
}

export default Logo
