"use client"

import { forwardRef, useCallback, useState } from "react"
import { Sigma, ChevronDown } from "lucide-react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/tiptap-ui-primitive/dropdown-menu"
import { Card, CardBody } from "@/components/tiptap-ui-primitive/card"

export interface MathDropdownMenuProps extends Omit<ButtonProps, "type"> {
  portal?: boolean
  onOpenChange?: (isOpen: boolean) => void
}

export const MathDropdownMenu = forwardRef<
  HTMLButtonElement,
  MathDropdownMenuProps
>(({ editor: providedEditor, portal = false, onOpenChange, ...buttonProps }, ref) => {
  const { editor } = useTiptapEditor(providedEditor)
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!editor) return
      setIsOpen(open)
      onOpenChange?.(open)
    },
    [editor, onOpenChange]
  )

  const insertMath = (latex: string, isBlock = false) => {
    if (!editor) return
    if (isBlock) {
      editor.chain().focus().insertBlockMath({ latex }).run()
    } else {
      editor.chain().focus().insertInlineMath({ latex }).run()
    }
    setIsOpen(false)
  }

  return (
    <DropdownMenu modal open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          data-style="ghost"
          role="button"
          tabIndex={-1}
          aria-label="Insert math"
          tooltip="Insert Math"
          {...buttonProps}
          ref={ref}
        >
          <Sigma className="tiptap-button-icon" />
          <ChevronDown className="tiptap-button-dropdown-small" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" portal={portal}>
        <Card>
          <CardBody>
            <ButtonGroup>
              <DropdownMenuItem asChild>
                <Button
                  data-style="ghost"
                  onClick={() => insertMath("x^2")}
                  className="tiptap-dropdown-menu-item"
                >
                  <span className="tiptap-button-text">Inline Math</span>
                  <span className="tiptap-button-shortcut">x²</span>
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button
                  data-style="ghost"
                  onClick={() => insertMath("\\int_0^1 x^2 dx", true)}
                  className="tiptap-dropdown-menu-item"
                >
                  <span className="tiptap-button-text">Block Math</span>
                  <span className="tiptap-button-shortcut">$$...$$</span>
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button
                  data-style="ghost"
                  onClick={() => insertMath("\\frac{a}{b}")}
                  className="tiptap-dropdown-menu-item"
                >
                  <span className="tiptap-button-text">Fraction</span>
                  <span className="tiptap-button-shortcut">a/b</span>
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button
                  data-style="ghost"
                  onClick={() => insertMath("\\int_a^b f(x)dx")}
                  className="tiptap-dropdown-menu-item"
                >
                  <span className="tiptap-button-text">Integral</span>
                  <span className="tiptap-button-shortcut">∫</span>
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button
                  data-style="ghost"
                  onClick={() => insertMath("\\sum_{i=1}^{n} x_i")}
                  className="tiptap-dropdown-menu-item"
                >
                  <span className="tiptap-button-text">Summation</span>
                  <span className="tiptap-button-shortcut">Σ</span>
                </Button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Button
                  data-style="ghost"
                  onClick={() => insertMath("\\L\\{f(t)\\}")}
                  className="tiptap-dropdown-menu-item"
                >
                  <span className="tiptap-button-text">Laplace</span>
                  <span className="tiptap-button-shortcut">ℒ</span>
                </Button>
              </DropdownMenuItem>
            </ButtonGroup>
          </CardBody>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

MathDropdownMenu.displayName = "MathDropdownMenu"

export default MathDropdownMenu



