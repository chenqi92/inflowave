pub fn default_app_language() -> String {
    language_for_locale(tauri_plugin_os::locale().as_deref()).to_string()
}

fn language_for_locale(locale: Option<&str>) -> &'static str {
    let language = locale
        .unwrap_or_default()
        .trim()
        .split(['-', '_', '.', '@'])
        .next()
        .unwrap_or_default();

    if language.eq_ignore_ascii_case("zh") {
        "zh-CN"
    } else {
        "en-US"
    }
}

#[cfg(test)]
mod tests {
    use super::language_for_locale;

    #[test]
    fn chinese_locales_use_chinese() {
        for locale in ["zh", "zh-CN", "zh-Hant-TW", "zh_CN.UTF-8", " ZH_hk "] {
            assert_eq!(language_for_locale(Some(locale)), "zh-CN", "{locale}");
        }
    }

    #[test]
    fn other_and_missing_locales_use_english() {
        for locale in ["en-US", "en_GB.UTF-8", "de-DE", "fr-FR", "C", "C.UTF-8", "POSIX", ""] {
            assert_eq!(language_for_locale(Some(locale)), "en-US", "{locale}");
        }
        assert_eq!(language_for_locale(None), "en-US");
    }
}
