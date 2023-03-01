using System;
using Acme.Models;
using Acme.Utils;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Acme.Data;

public class AcmeContext : DbContext {

    public AcmeContext(DbContextOptions<AcmeContext> options) : base(options) {
    }

    public DbSet<User> Users { get; set; }

    public static void Initialize(IServiceProvider serviceProvider) {
        using (var context = new AcmeContext(serviceProvider.GetRequiredService<DbContextOptions<AcmeContext>>())) {

            /// create database
            if (context.Database.EnsureCreated()) {

                // seed with initial data
                context.Users.AddRange(
                   new User { Guid = Guid.Parse("58189acb-ae3e-41c5-9bad-db1f0078db06"), Name = "Marvin Acme", Username = "admin", Password = HashUtils.HashPassword("acme"), Email = "marvin@acme.corp", IsAdmin = true },
                    new User { Guid = Guid.Parse("3a96ad49-0c71-45ec-bee5-96b8da030dfd"), Name = "Road Runner", Username = "meepmeep", Password = HashUtils.HashPassword("acme"), Email = "roadrunner@acme.corp" },
                    new User { Guid = Guid.Parse("294cca6f-902c-4398-ab73-dd901ff25cc0"), Name = "Bugs Bunny", Username = "bugs", Password = HashUtils.HashPassword("acme"), Email = "bugs@acme.corp" },
                    new User { Guid = Guid.Parse("3ebb6d2b-c984-4882-8f6a-683b6ae579cf"), Name = "Daffy Duck", Username = "daffy", Password = HashUtils.HashPassword("acme"), Email = "daffy@acme.corp" },
                    new User { Guid = Guid.Parse("211123e0-7b3a-449d-84da-18ac09c8feb4"), Name = "Porky Pig", Username = "porky", Password = HashUtils.HashPassword("acme"), Email = "porky@acme.corp" },
                    new User { Guid = Guid.Parse("8629515d-4516-483e-b02d-a9fd80270426"), Name = "Tweety Bird", Username = "tweety", Password = HashUtils.HashPassword("acme"), Email = "tweety@acme.corp" },
                    new User { Guid = Guid.Parse("b23da86f-2636-47fb-a146-4dcb453777a2"), Name = "Wile E. Coyote", Username = "wile", Password = HashUtils.HashPassword("acme"), Email = "wile@acme.corp" }
                );
                context.SaveChanges();
            }
        }
    }
}
