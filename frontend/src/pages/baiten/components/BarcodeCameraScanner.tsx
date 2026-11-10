import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeCameraScannerProps {
  onScan: (codigo: string) => void;
  ativo: boolean;
  setAtivo: (ativo: boolean) => void;
  ultimoCodigoLido?: string | null;
}

interface CameraDevice {
  id: string;
  label: string;
}

interface ZoomRange {
  min: number;
  max: number;
  step: number;
}

const FORMATOS_SUPORTADOS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.QR_CODE,
];

// Escolhe a lente traseira principal, evitando ultrawide / macro / tele,
// que costumam ter foco ruim para código de barras.
const escolherTraseira = (devices: CameraDevice[]): CameraDevice => {
  const traseiras = devices.filter((d) =>
    /back|rear|traseira|environment/i.test(d.label)
  );
  const lista = traseiras.length ? traseiras : devices;
  return lista.find((d) => !/ultra|wide|macro|tele/i.test(d.label)) ?? lista[0];
};

export const BarcodeCameraScanner: React.FC<BarcodeCameraScannerProps> = ({
  onScan,
  ativo,
  setAtivo,
  ultimoCodigoLido,
}) => {
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [avisoSeguranca, setAvisoSeguranca] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [cameraTraseira, setCameraTraseira] = useState(true);
  const [camerasDisponiveis, setCamerasDisponiveis] = useState<CameraDevice[]>([]);
  const [cameraSelecionada, setCameraSelecionada] = useState<string>(''); // escolha do usuário
  const [cameraAtualId, setCameraAtualId] = useState<string>(''); // câmera realmente em uso
  const [flashAtivo, setFlashAtivo] = useState(false);
  const [suportaFlash, setSuportaFlash] = useState(false);
  const [zoomRange, setZoomRange] = useState<ZoomRange | null>(null);
  const [zoom, setZoom] = useState(1);
  const [feedbackLeitura, setFeedbackLeitura] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileScannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const lastScanTimeRef = useRef<number>(0);
  const lastCodeRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Referências estáveis para evitar reinicializações da câmera
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const setAtivoRef = useRef(setAtivo);
  useEffect(() => {
    setAtivoRef.current = setAtivo;
  }, [setAtivo]);

  const ativoRef = useRef(ativo);
  useEffect(() => {
    ativoRef.current = ativo;
  }, [ativo]);

  const cameraSelecionadaRef = useRef(cameraSelecionada);
  useEffect(() => {
    cameraSelecionadaRef.current = cameraSelecionada;
  }, [cameraSelecionada]);

  const cameraTraseiraRef = useRef(cameraTraseira);
  useEffect(() => {
    cameraTraseiraRef.current = cameraTraseira;
  }, [cameraTraseira]);

  const elementoId = 'baiten-barcode-camera-view';

  // Verifica se o contexto é seguro (HTTPS ou localhost)
  useEffect(() => {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    const isHttps = window.location.protocol === 'https:';
    const isSecure = window.isSecureContext || isLocalhost || isHttps;

    if (!isSecure) {
      setAvisoSeguranca(
        'Atenção: Navegadores mobile exigem conexão segura (HTTPS ou localhost) para abrir a câmera ao vivo. Se estiver acessando via IP (ex: http://192.168.x.x), use a opção "Tirar Foto com a Câmera" abaixo ou ative HTTPS.'
      );
    }
  }, []);

  // Busca lista de câmeras do dispositivo
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCamerasDisponiveis(devices);
        }
      })
      .catch((e) => {
        console.warn('Não foi possível listar câmeras antecipadamente:', e);
      });
  }, []);

  const pararCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Aviso ao parar câmera:', err);
      } finally {
        scannerRef.current = null;
        setFlashAtivo(false);
        setSuportaFlash(false);
        setZoomRange(null);
        setZoom(1);
        setCameraAtualId('');
      }
    }
  }, []);

  const processarCodigoLido = useCallback((decodedText: string) => {
    const now = Date.now();
    const cleanCode = decodedText.trim();

    // Cooldown de 2.2s para mesmo código e 1.2s para código diferente
    const intervaloMinimo = cleanCode === lastCodeRef.current ? 2200 : 1200;
    if (now - lastScanTimeRef.current < intervaloMinimo) {
      return;
    }

    lastScanTimeRef.current = now;
    lastCodeRef.current = cleanCode;

    setFeedbackLeitura(cleanCode);
    setTimeout(() => setFeedbackLeitura(null), 1200);

    onScanRef.current(cleanCode);
  }, []);

  // Monta as constraints de vídeo: resolução alta + câmera desejada.
  // IMPORTANTE: quando videoConstraints é informado, o html5-qrcode usa SOMENTE
  // ele (ignora o 1º argumento de start), então deviceId/facingMode vão aqui.
  const montarVideoConstraints = (deviceId?: string): MediaTrackConstraints => {
    const base: MediaTrackConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    };
    if (deviceId) {
      return { ...base, deviceId: { exact: deviceId } };
    }
    return {
      ...base,
      facingMode: cameraTraseiraRef.current ? 'environment' : 'user',
    };
  };

  const iniciarCamera = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setCarregando(true);
    setErroCamera(null);

    await pararCamera();

    try {
      const html5QrCode = new Html5Qrcode(elementoId, {
        formatsToSupport: FORMATOS_SUPORTADOS,
        // Usa o detector nativo do navegador quando existir (Chrome Android):
        // muito mais rápido e tolerante a foco ruim.
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      const criarScanConfig = (deviceId?: string) => ({
        fps: 20,
        // Caixa larga e baixa, boa para código de barras 1D
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const w = Math.floor(viewfinderWidth * 0.9);
          const h = Math.floor(Math.min(viewfinderHeight * 0.5, 200));
          return { width: Math.max(w, 200), height: Math.max(h, 100) };
        },
        // Sem aspectRatio fixo: ele conflita com videoConstraints
        videoConstraints: montarVideoConstraints(deviceId),
      });

      const escolhida = cameraSelecionadaRef.current;
      const facing = cameraTraseiraRef.current ? 'environment' : 'user';

      try {
        if (escolhida) {
          await html5QrCode.start(
            escolhida,
            criarScanConfig(escolhida),
            processarCodigoLido,
            () => { }
          );
        } else {
          await html5QrCode.start(
            { facingMode: facing },
            criarScanConfig(),
            processarCodigoLido,
            () => { }
          );
        }
      } catch (firstErr: any) {
        console.warn('Tentativa inicial falhou, tentando fallback...', firstErr);

        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCamerasDisponiveis(devices);
          const chosen = cameraTraseiraRef.current
            ? escolherTraseira(devices)
            : devices[0];

          await html5QrCode.start(
            chosen.id,
            criarScanConfig(chosen.id),
            processarCodigoLido,
            () => { }
          );
        } else {
          await html5QrCode.start(
            { facingMode: 'user' },
            criarScanConfig(),
            processarCodigoLido,
            () => { }
          );
        }
      }

      // Descobre qual câmera está de fato em uso (para o <select>)
      try {
        const settings: any = html5QrCode.getRunningTrackSettings();
        if (settings?.deviceId) setCameraAtualId(settings.deviceId);
      } catch {
        /* ignora */
      }

      // Capacidades: lanterna, foco contínuo e zoom
      try {
        const caps: any = html5QrCode.getRunningTrackCapabilities();

        if (caps?.torch) setSuportaFlash(true);

        if (Array.isArray(caps?.focusMode) && caps.focusMode.includes('continuous')) {
          await html5QrCode.applyVideoConstraints({
            advanced: [{ focusMode: 'continuous' } as any],
          });
        }

        if (caps?.zoom) {
          const min = caps.zoom.min ?? 1;
          const max = caps.zoom.max ?? 1;
          const step = caps.zoom.step || 0.1;
          setZoomRange({ min, max, step });

          // Zoom inicial moderado: permite ficar mais longe do produto
          const inicial = Math.min(Math.max(2, min), max);
          await html5QrCode.applyVideoConstraints({
            advanced: [{ zoom: inicial } as any],
          });
          setZoom(inicial);
        }
      } catch (capErr) {
        console.warn('Não foi possível aplicar foco/zoom:', capErr);
      }
    } catch (err: any) {
      console.error('Falha crítica ao abrir câmera:', err);
      let msg = err.message || 'Não foi possível acessar a câmera do smartphone.';

      if (
        err.name === 'NotAllowedError' ||
        err.message?.includes('Permission') ||
        err.message?.includes('denied')
      ) {
        msg =
          'Permissão de câmera negada. Habilite a câmera nas configurações ou toque no ícone de permissão na barra do navegador.';
      } else if (err.name === 'NotFoundError' || err.message?.includes('device not found')) {
        msg = 'Nenhuma câmera encontrada neste aparelho.';
      } else if (err.message?.includes('facingMode')) {
        msg = 'Câmera traseira indisponível. Tente alternar para a câmera frontal.';
      } else if (err.name === 'NotReadableError' || err.message?.includes('in use')) {
        msg = 'A câmera já está sendo usada por outro aplicativo ou aba do navegador.';
      }

      setErroCamera(msg);
      setAtivoRef.current(false);
    } finally {
      isStartingRef.current = false;
      setCarregando(false);
    }
  }, [pararCamera, processarCodigoLido]);

  // Liga / desliga a câmera conforme "ativo"
  useEffect(() => {
    if (ativo) {
      iniciarCamera();
    } else {
      pararCamera();
    }

    return () => {
      pararCamera();
    };
  }, [ativo, iniciarCamera, pararCamera]);

  // Reinicia a câmera quando o usuário troca de lente / traseira-frontal
  const primeiraRenderRef = useRef(true);
  useEffect(() => {
    if (primeiraRenderRef.current) {
      primeiraRenderRef.current = false;
      return;
    }
    if (ativoRef.current) {
      iniciarCamera();
    }
  }, [cameraSelecionada, cameraTraseira, iniciarCamera]);

  // Alternar lanterna (torch)
  const alternarFlash = async () => {
    if (!scannerRef.current) return;
    try {
      const novoEstado = !flashAtivo;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: novoEstado } as any],
      });
      setFlashAtivo(novoEstado);
    } catch (err) {
      console.warn('Lanterna não suportada:', err);
    }
  };

  // Alterar zoom
  const alterarZoom = async (valor: number) => {
    setZoom(valor);
    try {
      await scannerRef.current?.applyVideoConstraints({
        advanced: [{ zoom: valor } as any],
      });
    } catch (e) {
      console.warn('Zoom não suportado:', e);
    }
  };

  // Tocar no visor para refocar
  const refocar = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      // Alterna para "single-shot" e volta para "continuous" para forçar novo foco
      const caps: any = scanner.getRunningTrackCapabilities();
      const modos: string[] = Array.isArray(caps?.focusMode) ? caps.focusMode : [];
      if (modos.includes('single-shot')) {
        await scanner.applyVideoConstraints({
          advanced: [{ focusMode: 'single-shot' } as any],
        });
      }
      if (modos.includes('continuous')) {
        await scanner.applyVideoConstraints({
          advanced: [{ focusMode: 'continuous' } as any],
        });
      }
    } catch {
      /* ignora: nem todo aparelho permite controlar o foco */
    }
  };

  // Alternar câmera traseira / frontal
  const alternarCamera = () => {
    setCameraSelecionada('');
    setCameraTraseira((prev) => !prev);
  };

  // Fallback: leitura de código de barras a partir de foto tirada no celular
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCarregando(true);
    setErroCamera(null);

    try {
      if (!fileScannerRef.current) {
        fileScannerRef.current = new Html5Qrcode('baiten-file-scanner-temp', {
          formatsToSupport: FORMATOS_SUPORTADOS,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          verbose: false,
        });
      }

      const decodedText = await fileScannerRef.current.scanFile(file, true);
      processarCodigoLido(decodedText);
    } catch (err: any) {
      console.warn('Erro ao decodificar imagem:', err);
      setErroCamera(
        'Não foi possível reconhecer um código de barras legível nesta foto. Aproxime mais e mantenha o foco.'
      );
    } finally {
      setCarregando(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="camera-scanner-wrapper">
      {/* Container invisível para decodificação de fotos */}
      <div id="baiten-file-scanner-temp" style={{ display: 'none' }} />

      {/* Input oculto para abrir a câmera nativa do celular (foto) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileScan}
      />

      <div className="camera-scanner-header">
        <div className="camera-scanner-title">
          <span className="camera-icon">📷</span>
          <strong>Câmera do Smartphone</strong>
          {ativo && <span className="live-indicator">AO VIVO</span>}
        </div>

        <div className="camera-scanner-actions">
          {ativo && (
            <>
              {suportaFlash && (
                <button
                  type="button"
                  className={`btn-camera-ctrl ${flashAtivo ? 'active' : ''}`}
                  onClick={alternarFlash}
                  title="Ligar/Desligar Lanterna"
                >
                  {flashAtivo ? '🔦 Lanterna ON' : '💡 Lanterna'}
                </button>
              )}

              {camerasDisponiveis.length > 1 ? (
                <select
                  className="select-camera-device"
                  value={cameraSelecionada || cameraAtualId}
                  onChange={(e) => {
                    setCameraSelecionada(e.target.value);
                  }}
                  title="Selecionar Câmera"
                >
                  {camerasDisponiveis.map((cam, idx) => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Câmera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  className="btn-camera-ctrl"
                  onClick={alternarCamera}
                  title="Inverter Câmera (Traseira / Frontal)"
                >
                  🔄 Inverter
                </button>
              )}
            </>
          )}

          <button
            type="button"
            className={`btn-toggle-camera ${ativo ? 'btn-stop' : 'btn-start'}`}
            onClick={() => setAtivo(!ativo)}
            disabled={carregando}
          >
            {carregando
              ? 'Abrindo...'
              : ativo
                ? '⏹ Parar Câmera'
                : '📸 Abrir Câmera ao Vivo'}
          </button>
        </div>
      </div>

      {avisoSeguranca && !ativo && (
        <div
          className="status-banner"
          style={{
            background: '#fffbeb',
            color: '#b45309',
            border: '1px solid #fde68a',
            fontSize: '0.85rem',
          }}
        >
          <span>💡 {avisoSeguranca}</span>
        </div>
      )}

      {erroCamera && (
        <div className="status-banner erro camera-error">
          <span>⚠️ {erroCamera}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-retry"
              onClick={() => {
                setErroCamera(null);
                iniciarCamera();
              }}
            >
              Tentar Novamente
            </button>
            <button
              type="button"
              className="btn-retry"
              style={{ background: '#fef2f2', borderColor: '#ef4444' }}
              onClick={() => fileInputRef.current?.click()}
            >
              📸 Tirar Foto
            </button>
          </div>
        </div>
      )}

      {/* Visor da Câmera */}
      <div className={`camera-viewport-card ${ativo ? 'camera-active' : 'camera-inactive'}`}>
        <div id={elementoId} className="camera-video-container" onClick={refocar} />

        {!ativo && (
          <div className="camera-placeholder">
            <div className="placeholder-icon-circle" onClick={() => setAtivo(true)}>
              <span className="placeholder-icon">📸</span>
            </div>
            <h4>Leitor de Código de Barras por Câmera</h4>
            <p>
              Aponte a câmera para a barra de código do produto para adicionar automaticamente ao
              carrinho.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                marginTop: '0.5rem',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <button type="button" className="btn-start-mini" onClick={() => setAtivo(true)}>
                📸 Abrir Câmera ao Vivo
              </button>

              <button
                type="button"
                className="btn-start-mini"
                style={{ background: 'var(--secondary)' }}
                onClick={() => fileInputRef.current?.click()}
              >
                📷 Tirar Foto do Código
              </button>
            </div>
          </div>
        )}

        {ativo && (
          <div className="camera-overlay-guide" style={{ pointerEvents: 'none' }}>
            <div className="scanner-target-reticle">
              <span className="corner top-left"></span>
              <span className="corner top-right"></span>
              <span className="corner bottom-left"></span>
              <span className="corner bottom-right"></span>
              <div className="scanner-laser-line"></div>
            </div>
            <p className="scanner-guide-text">
              Posicione o código de barras no centro da linha vermelha
            </p>
          </div>
        )}

        {feedbackLeitura && (
          <div className="scan-success-flash">
            <span className="scan-success-check">✓</span>
            <span>
              Código Lido: <strong>{feedbackLeitura}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Controle de zoom (só aparece se o aparelho/navegador suportar) */}
      {ativo && zoomRange && zoomRange.max > zoomRange.min && (
        <div
          className="zoom-control"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0' }}
        >
          <span>🔍</span>
          <input
            type="range"
            min={zoomRange.min}
            max={zoomRange.max}
            step={zoomRange.step}
            value={zoom}
            onChange={(e) => alterarZoom(Number(e.target.value))}
            style={{ flex: 1 }}
            aria-label="Zoom da câmera"
          />
          <span style={{ minWidth: 40, textAlign: 'right' }}>{zoom.toFixed(1)}x</span>
        </div>
      )}

      {ultimoCodigoLido && (
        <div className="last-scanned-bar">
          <span>Último bipado:</span>
          <code>{ultimoCodigoLido}</code>
        </div>
      )}
    </div>
  );
};