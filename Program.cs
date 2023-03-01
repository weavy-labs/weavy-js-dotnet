using System;
using Acme.Data;
using Acme.Http;
using Acme.Hubs;
using Acme.Models;
using Acme.Mvc;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Serilog.Events;

Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateBootstrapLogger();
Log.Information("Starting up");
try {
    // configure services
    var builder = WebApplication.CreateBuilder(args);
    builder.Host.UseSerilog((context, services, configuration) => {
        configuration
            .MinimumLevel.Is(LogEventLevel.Debug)
            .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Warning)
            .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Warning)
            .MinimumLevel.Override("Microsoft.Extensions.Http.DefaultHttpClientFactory", LogEventLevel.Warning)
            .MinimumLevel.Override("System.Net.Http.HttpClient.WeavyClient.LogicalHandler", LogEventLevel.Warning)
            .WriteTo.Console();
    });

    var connectionString = builder.Configuration.GetConnectionString("Acme") ?? "Filename=acme.db";
    builder.Services.AddDbContext<AcmeContext>(options => {
        options.UseSqlite(connectionString);
    }).AddDatabaseDeveloperPageExceptionFilter();

    builder.Services.AddHttpContextAccessor();
    builder.Services.AddControllersWithViews().AddRazorRuntimeCompilation();
    builder.Services.AddSignalR();
    builder.Services.AddSingleton<IUserIdProvider, UserIdProvider>();
    builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(options => {
        options.LoginPath = "/login";
    });

    builder.Services.AddHttpClient<WeavyClient>();
    builder.Services.AddOptions<WeavyOptions>().Bind(builder.Configuration.GetSection("Weavy")).ValidateDataAnnotations();
    builder.Services.AddScoped<UserAccessor>();
    builder.Services.AddSingleton<IHtmlGenerator, BootstrapHtmlGenerator>();
    builder.Services.AddSingleton<ITokenStore, InMemoryTokenStore>();

    builder.Services.Configure<MvcViewOptions>(options => options.HtmlHelperOptions.ClientValidationEnabled = false);
    builder.Services.Configure<RouteOptions>(options => options.LowercaseUrls = true);

    // build the application
    var app = builder.Build();

    // init database
    using (var scope = app.Services.CreateScope()) {
        var services = scope.ServiceProvider;
        AcmeContext.Initialize(services);
    }

    // configure request pipeline
    app.UseExceptionHandler("/500");
    app.UseHttpsRedirection();
    app.UseStaticFiles();
    app.UseStatusCodePagesWithReExecute("/{0}");
    app.UseSerilogRequestLogging();
    app.UseRouting();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();
    app.MapHub<NotificationHub>("/hub");

    // run the application
    app.Run();
} catch (Exception ex) {
    Log.Fatal(ex, "Unhandled exception");
} finally {
    Log.Information("Shutdown complete");
    Log.CloseAndFlush();
}
