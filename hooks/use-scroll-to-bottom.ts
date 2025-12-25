"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type ScrollBehaviorOrInstant = ScrollBehavior | "instant"

export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const isAtBottomRef = useRef(true)
  const isUserScrollingRef = useRef(false)

  useEffect(() => {
    isAtBottomRef.current = isAtBottom
  }, [isAtBottom])

  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) {
      return true
    }
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    return scrollTop + clientHeight >= scrollHeight - 100
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehaviorOrInstant = "smooth") => {
    if (!containerRef.current) {
      return
    }
    const normalizedBehavior: ScrollBehavior =
      behavior === "instant" ? "auto" : behavior
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: normalizedBehavior,
    })

    setIsAtBottom(true)
    isAtBottomRef.current = true

    requestAnimationFrame(() => {
      const atBottom = checkIfAtBottom()
      setIsAtBottom(atBottom)
      isAtBottomRef.current = atBottom
    })
  }, [checkIfAtBottom])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    let scrollTimeout: ReturnType<typeof setTimeout>

    const handleScroll = () => {
      isUserScrollingRef.current = true
      clearTimeout(scrollTimeout)

      const atBottom = checkIfAtBottom()
      setIsAtBottom(atBottom)
      isAtBottomRef.current = atBottom

      scrollTimeout = setTimeout(() => {
        isUserScrollingRef.current = false
      }, 150)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      container.removeEventListener("scroll", handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [checkIfAtBottom])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const scrollIfNeeded = () => {
      if (isAtBottomRef.current && !isUserScrollingRef.current) {
        requestAnimationFrame(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "auto",
          })
          setIsAtBottom(true)
          isAtBottomRef.current = true
        })
      }
    }

    const mutationObserver = new MutationObserver(scrollIfNeeded)
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    const resizeObserver = new ResizeObserver(scrollIfNeeded)
    resizeObserver.observe(container)

    for (const child of container.children) {
      resizeObserver.observe(child)
    }

    return () => {
      mutationObserver.disconnect()
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    // Defer to the next frame to avoid triggering synchronous state updates in an effect body.
    const id = requestAnimationFrame(() => {
      scrollToBottom("instant")
    })
    return () => cancelAnimationFrame(id)
  }, [scrollToBottom])

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
  }
}




