// macOS CGEvent tap — monitors Option key double-press
// Build: clang -o keymonitor keymonitor.c -framework Cocoa -framework Carbon -Os

#include <Cocoa/Cocoa.h>
#include <Carbon/Carbon.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

static CFMachPortRef eventTap = NULL;
static long long lastPressTime = 0;
static long long interval = 300; // ms
static int keyCode = 58; // Left Option = 58, Right Option = 61
static int keyCode2 = 61;

long long nowMs() {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return ts.tv_sec * 1000LL + ts.tv_nsec / 1000000LL;
}

CGEventRef callback(CGEventTapProxy proxy, CGEventType type,
                     CGEventRef event, void *refcon) {
    if (type == kCGEventFlagsChanged) {
        CGEventFlags flags = CGEventGetFlags(event);
        int64_t kc = CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode);

        int isOption = (kc == keyCode || kc == keyCode2);
        int isPressed = (flags & kCGEventFlagMaskAlternate) != 0;

        if (isOption && isPressed) {
            long long now = nowMs();
            if (now - lastPressTime < interval && lastPressTime > 0) {
                printf("DOUBLE_PRESS\n");
                fflush(stdout);
            }
            lastPressTime = now;
        }
    }
    return event;
}

int main(int argc, char **argv) {
    if (argc > 1) interval = atoi(argv[1]);

    // Request accessibility permission
    NSDictionary *options = @{(id)kAXTrustedCheckOptionPrompt: @YES};
    if (!AXIsProcessTrustedWithOptions((CFDictionaryRef)options)) {
        fprintf(stderr, "Accessibility permission required\n");
    }

    CGEventMask mask = CGEventMaskBit(kCGEventFlagsChanged);

    // Poll until accessibility permission is granted
    while (!eventTap) {
        eventTap = CGEventTapCreate(kCGHIDEventTap, kCGHeadInsertEventTap,
                                    kCGEventTapOptionDefault, mask, callback, NULL);
        if (!eventTap) {
            fprintf(stderr, "Waiting for accessibility permission...\n");
            sleep(1);
        }
    }

    CFRunLoopSourceRef src = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0);
    CFRunLoopAddSource(CFRunLoopGetCurrent(), src, kCFRunLoopCommonModes);
    CGEventTapEnable(eventTap, true);

    printf("READY\n");
    fflush(stdout);

    // Listen for space/desktop switch to hide window
    [[[NSWorkspace sharedWorkspace] notificationCenter]
        addObserverForName:NSWorkspaceActiveSpaceDidChangeNotification
        object:nil queue:nil usingBlock:^(NSNotification *note) {
            printf("SPACE_CHANGED\n");
            fflush(stdout);
        }];

    printf("READY\n");
    fflush(stdout);

    CFRunLoopRun();
    return 0;
}
