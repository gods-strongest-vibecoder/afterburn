# afterburn-demo.tape
# Usage: vhs demo/afterburn-demo.tape
# Produces: demo/afterburn-demo.gif
# Note: Requires VHS_NO_SANDBOX=true when running as root/Docker
# Note: Currently using generate-gif.mjs as primary (VHS hangs in headless envs)

Output demo/afterburn-demo.gif

Set Shell "bash"
Set FontSize 22
Set FontFamily "DejaVu Sans Mono"
Set Width 1000
Set Height 600
Set Padding 30
Set LineHeight 1.3
Set Framerate 12
Set Theme "Catppuccin Mocha"
Set WindowBar Colorful
Set WindowBarSize 40
Set BorderRadius 12
Set CursorBlink false
Set TypingSpeed 40ms
Set LoopOffset 60%

# Beat 1: Command visible from frame 1 (this IS the GitHub thumbnail)
Sleep 600ms
Type "npx afterburn https://my-saas.vercel.app"
Sleep 1000ms

# Hide the real Enter so viewer doesn't see we swap to mock
Hide
Enter
Sleep 200ms
Type "clear && bash demo/mock-scan.sh"
Enter
Show

# Wait for mock output to complete (total mock runtime ~6s)
Sleep 7s

# Linger on final results so viewer can absorb
Sleep 3s
