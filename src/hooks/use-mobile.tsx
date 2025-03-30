
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Check on mount and window resize
    checkMobile()
    window.addEventListener("resize", checkMobile)
    
    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  return !!isMobile
}

// Additional hook to get current viewport width
export function useViewportWidth() {
  const [width, setWidth] = React.useState<number | undefined>(
    typeof window !== "undefined" ? window.innerWidth : undefined
  )

  React.useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth)
    
    window.addEventListener("resize", handleResize)
    
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return width
}
