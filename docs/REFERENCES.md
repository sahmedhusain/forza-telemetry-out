# Reference review

Sources reviewed 25 October 2026; retained for version **1.6.0**. [Comparative review](RESEARCH.md) · [Current implementation and limits](ANALYTICS.md)

- [Official FH6 Data Out documentation](https://support.forza.net/hc/en-us/articles/51744149102611-Forza-Horizon-6-Data-Out-Documentation): authoritative field list, configuration, stream lifecycle and reserved port range. This takes priority over third-party setup examples.
- [co-driver](https://github.com/Ojansen/co-driver): emphasizes tuning relationships, per-corner measurements, session analysis and second-screen use. It informed the focus on relationships and explanations. Its multi-game, garage and tuning workbench features were not copied or claimed here.
- [Wisp](https://github.com/Views2k/Wisp): emphasizes a configurable Forza HUD, Windows packaging and second-screen driving information. It informed display preferences and explicit desktop/connection guidance. This app uses official one-way UDP and does not inject a game overlay.
- [Microsoft Forza 3 manual](https://download.microsoft.com/download/F/9/9/F99AB8F0-5191-4EDD-B312-7A9B9E4784FA/Forza3_MNL_EN-PEGI_NonLive.pdf): historical reference for Forza's organization of telemetry into pages such as friction, suspension and acceleration. It is not evidence that FH6 exposes identical HUD behavior or every on-screen metric over UDP.
- [electron-builder platform build documentation](https://www.electron.build/v26/docs/features/multi-platform-build/): packaging guidance. Local Windows build artifacts still require execution testing on Windows.

No source code, branded game screenshots or visual assets were imported from the reference projects. The generic sports-car diagram is original vector artwork driven by the available packet values. In-game tire pressure, wear, camber and other metrics absent from the documented Data Out packet are not invented.

The [25 October comparative review](RESEARCH.md) covers the newly supplied Racing View, austinbaccus repository, community discussion and HokiHoshi video, with current-data boundaries and implemented/future decisions.
