import useEscapeClose from "../../hooks/useEscapeClose";
import { getDefaultModel, getProvider, providers } from "../../ai/providers";
import { AiSettings } from "../../ai/types";

import AiSettingsDialogProps from "./AiSettingsDialogProps";
import * as styles from "./AiSettingsDialog.module.css";

function AiSettingsDialog({
    settings, onChange, onClose
}: AiSettingsDialogProps) {
    useEscapeClose(onClose);

    const provider = getProvider(settings.provider);
    const key = settings.keys[settings.provider] ?? "";

    return <div
        className={styles.backdrop}
        onPointerDown={event => {
            if (event.target == event.currentTarget) onClose();
        }}
    >
        <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-settings-title"
        >
            <div className={styles.header}>
                <h2 className={styles.title} id="ai-settings-title">
                    Coach settings
                </h2>
                <button className={styles.done} onClick={onClose}>Done</button>
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="ai-provider">Provider</label>
                <select
                    id="ai-provider"
                    className={styles.select}
                    value={settings.provider}
                    onChange={event => {
                        const id = event.target.value as AiSettings["provider"];

                        onChange({
                            ...settings,
                            provider: id,
                            model: getDefaultModel(id),
                            baseUrl: ""
                        });
                    }}
                >
                    {providers.map(item => <option key={item.id} value={item.id}>
                        {item.name}
                    </option>)}
                </select>
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="ai-model">Model</label>
                <input
                    id="ai-model"
                    className={styles.input}
                    list="ai-models"
                    value={settings.model}
                    placeholder="Model identifier"
                    onChange={event => onChange({
                        ...settings,
                        model: event.target.value
                    })}
                />

                <datalist id="ai-models">
                    {provider.models.map(model => <option
                        key={model.id}
                        value={model.id}
                    >
                        {model.label}
                    </option>)}
                </datalist>
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="ai-key">
                    API key {provider.requiresKey ? "" : "(optional)"}
                </label>
                <input
                    id="ai-key"
                    className={styles.input}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={key}
                    placeholder={provider.requiresKey ? "Paste your key" : "Not needed"}
                    onChange={event => onChange({
                        ...settings,
                        keys: {
                            ...settings.keys,
                            [settings.provider]: event.target.value
                        }
                    })}
                />
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="ai-base-url">
                    API base URL
                </label>
                <input
                    id="ai-base-url"
                    className={styles.input}
                    value={settings.baseUrl}
                    placeholder={provider.baseUrl || "https://example.com/v1"}
                    spellCheck={false}
                    onChange={event => onChange({
                        ...settings,
                        baseUrl: event.target.value
                    })}
                />
                <span className={styles.hint}>
                    Leave blank for the provider default. Set a proxy URL here
                    if the browser blocks the provider.
                </span>
            </div>

            <div className={styles.field}>
                <label className={styles.label} htmlFor="ai-lichess">
                    Lichess token (optional)
                </label>
                <input
                    id="ai-lichess"
                    className={styles.input}
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={settings.lichessToken ?? ""}
                    placeholder="For the opening explorer"
                    onChange={event => onChange({
                        ...settings,
                        lichessToken: event.target.value
                    })}
                />
                <span className={styles.hint}>
                    Lichess now requires a token for its opening explorer.
                    Create one at lichess.org/account/oauth/token. Cloud
                    evaluations and the tablebase work without it.
                </span>
            </div>

            <p className={styles.note}>
                Your key is stored in this browser only. It is sent directly to
                the provider, never to Chessasist. Use a limited key. Choose a
                model with tool calling so the coach can read the board and run
                Stockfish.
            </p>

            {provider.browser == "unclear" && <p className={styles.warning}>
                {provider.name} may block browser requests. If it fails, use
                OpenRouter or point the base URL at your own proxy.
            </p>}
        </div>
    </div>;
}

export default AiSettingsDialog;
