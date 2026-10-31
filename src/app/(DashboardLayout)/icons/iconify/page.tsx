import React from "react";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import type { Metadata } from "next";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Iconify Tabler Icons",
};

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Iconify Icons",
  },
];
const page = () => {
  return (
    <>
      <BreadcrumbComp title="Iconify Icons" items={BCrumb} />
      <Card className='flex flex-col gap-3'>
        <div className='space-y-2'>
          <h6>⚙️ Installation</h6>
          <p>
            To use Tabler icons in your project, install the official React
            package:
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
            <code>npm install @iconify/react</code>
          </pre>
        </div>
        <div className='space-y-2'>
          <h6>🧩 Usage Example</h6>
          <p>Import and use any icon in your components:</p>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
            <code>{`import { Icon } from '@iconify/react';
function MyComponent() {
  return <Icon icon='solar:arrow-right-linear' width='20' height='20' />;
}`}</code>
          </pre>
        </div>
        <div className='space-y-2'>
          <h6>🔍 Explore Icons</h6>
          <iframe
            src='https://icon-sets.iconify.design/solar/'
            title='Inline Frame Example'
            width='100%'
            height='650'></iframe>
        </div>
      </Card>
    </>
  );
};

export default page;
