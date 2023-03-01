using System;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Acme.Utils;

/// <summary>
/// 
/// </summary>
public static class TaskUtils {

    /// <summary>
    ///  Helper for fire-and-forget with exception logging.
    /// </summary>
    /// <param name="task">The task to fire and forget.</param>
    /// <param name="logger">A logger for logging exceptions.</param>
    /// <param name="methodName">Method name or property name of the caller.</param>
    /// <exception cref="ArgumentNullException"></exception>
    /// <remarks>Inspired by a tweet from Ben Adams: https://twitter.com/ben_a_adams/status/1045060828700037125.</remarks>
    public static void FireAndForget(this Task task, ILogger logger = null, [CallerMemberName] string methodName = "") {
        ArgumentNullException.ThrowIfNull(task);

        // pass params explicitly to async local function or it will allocate to pass them
        static async Task ForgetAwaited(Task task, ILogger logger = null, string methodName = "") {
            try {
                await task;
            } catch (TaskCanceledException tce) {
                logger?.LogError(tce, "Fire and forget from {method} was canceled", methodName);
            } catch (Exception e) {
                logger?.LogError(e, "Fire and forget from {method} failed", methodName);
            }
        }

        // only care about tasks that may fault (not completed) or are faulted, so fast-path for completed and canceled tasks
        if (!task.IsCanceled && (!task.IsCompleted || task.IsFaulted)) {
            // discard since we don't want to wait for call to complete
            _ = ForgetAwaited(task, logger, methodName);
        }
    }


}
