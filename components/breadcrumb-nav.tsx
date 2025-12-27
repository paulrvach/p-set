"use client";

import * as React from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbNavItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbNavItem[];
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center gap-2">
                    {item.label}
                  </BreadcrumbPage>
                ) : item.href ? (
                  <BreadcrumbLink
                    render={
                      <Link
                        href={item.href}
                        className="hover:text-foreground transition-colors"
                      />
                    }
                  >
                    {item.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

