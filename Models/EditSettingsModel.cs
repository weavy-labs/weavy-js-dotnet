using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Acme.Models;

/// <summary>
/// Input model for user settings.
/// </summary>
public class EditSettingsModel {


    public EditSettingsModel() {
        TimeZones.Add(new SelectListItem());
        foreach (var tz in TimeZoneInfo.GetSystemTimeZones()) {
            TimeZones.Add(new SelectListItem { Value = tz.Id, Text = tz.DisplayName });
        }
    }


    /// <summary>
    ///  Gets or sets the user's preferred time zone.
    /// </summary>
    [Display(Name = "TimeZone", Description = "Your preferred time zone.")]
    public string TimeZone { get; set; }

    public List<SelectListItem> TimeZones { get; } = new();
}



