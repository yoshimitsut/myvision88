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
  const [cameraSelecionada, setCameraSelecionada] = useState<string>('');
  const [flashAtivo, setFlashAtivo] = useState(false);
  const [suportaFlash, setSuportaFlash] = useState(false);
  const [feedbackLeitura, setFeedbackLeitura] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileScannerRef = useRef<Html5Qrcode | null>(null);
  const isStartingRef = useRef(false);
  const lastScanTimeRef = useRef<number>(0);
  const lastCodeRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mantém referência estável de onScan para evitar reinicializações da câmera
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

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
      }
    }
  }, []);

  const processarCodigoLido = (decodedText: string) => {
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
  };

  const iniciarCamera = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setCarregando(true);
    setErroCamera(null);

    await pararCamera();

    try {
      const html5QrCode = new Html5Qrcode(elementoId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const w = Math.floor(Math.min(viewfinderWidth * 0.88, 320));
          const h = Math.floor(Math.min(viewfinderHeight * 0.45, 160));
          return { width: Math.max(w, 200), height: Math.max(h, 100) };
        },
        aspectRatio: 1.333333,
      };

      // Tenta iniciar com câmera selecionada ou modo "environment" (traseira)
      try {
        if (cameraSelecionada) {
          await html5QrCode.start(
            cameraSelecionada,
            scanConfig,
            processarCodigoLido,
            () => {}
          );
        } else {
          // html5-qrcode requer string exata 'environment' ou 'user'
          const facing = cameraTraseira ? 'environment' : 'user';
          await html5QrCode.start(
            { facingMode: facing },
            scanConfig,
            processarCodigoLido,
            () => {}
          );
        }
      } catch (firstErr: any) {
        console.warn('Tentativa inicial com facingMode falhou, tentando fallback...', firstErr);

        // Fallback: tenta listar câmeras e usar a melhor disponível
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCamerasDisponiveis(devices);
          // Em celulares, a última câmera listada geralmente é a traseira principal
          const chosen = cameraTraseira ? devices[devices.length - 1] : devices[0];
          setCameraSelecionada(chosen.id);

          await html5QrCode.start(
            chosen.id,
            scanConfig,
            processarCodigoLido,
            () => {}
          );
        } else {
          // Tenta câmera frontal padrão
          await html5QrCode.start(
            { facingMode: 'user' },
            scanConfig,
            processarCodigoLido,
            () => {}
          );
        }
      }

      // Verifica suporte a lanterna (torch)
      try {
        const capabilities: any = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setSuportaFlash(true);
        }
      } catch {
        setSuportaFlash(false);
      }
    } catch (err: any) {
      console.error('Falha crítica ao abrir câmera:', err);
      let msg = err.message || 'Não foi possível acessar a câmera do smartphone.';

      if (err.name === 'NotAllowedError' || err.message?.includes('Permission') || err.message?.includes('denied')) {
        msg = 'Permissão de câmera negada. Habilite a câmera nas configurações ou toque no ícone de permissão na barra do navegador.';
      } else if (err.name === 'NotFoundError' || err.message?.includes('device not found')) {
        msg = 'Nenhuma câmera encontrada neste aparelho.';
      } else if (err.message?.includes('facingMode')) {
        msg = 'Câmera traseira indisponível. Tente alternar para a câmera frontal.';
      } else if (err.name === 'NotReadableError' || err.message?.includes('in use')) {
        msg = 'A câmera já está sendo usada por outro aplicativo ou aba do navegador.';
      }

      setErroCamera(msg);
      setAtivo(false);
    } finally {
      isStartingRef.current = false;
      setCarregando(false);
    }
  }, [cameraSelecionada, cameraTraseira, pararCamera, setAtivo]);

  // Efeito para ativar/desativar câmera
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

  // Alternar câmera traseira / frontal
  const alternarCamera = () => {
    setCameraSelecionada('');
    setCameraTraseira((prev) => !prev);
  };

  // Fallback 100% infalível: Leitura de código de barras a partir de foto tirada no celular
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCarregando(true);
    setErroCamera(null);

    try {
      if (!fileScannerRef.current) {
        fileScannerRef.current = new Html5Qrcode('baiten-file-scanner-temp', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
      }

      const decodedText = await fileScannerRef.current.scanFile(file, true);
      processarCodigoLido(decodedText);
    } catch (err: any) {
      console.warn('Erro ao decodificar imagem:', err);
      setErroCamera('Não foi possível reconhecer um código de barras legível nesta foto. Aproxime mais e mantenha o foco.');
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
                  value={cameraSelecionada}
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
        <div className="status-banner" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontSize: '0.85rem' }}>
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
        <div id={elementoId} className="camera-video-container" />

        {!ativo && (
          <div className="camera-placeholder">
            <div className="placeholder-icon-circle" onClick={() => setAtivo(true)}>
              <span className="placeholder-icon">📸</span>
            </div>
            <h4>Leitor de Código de Barras por Câmera</h4>
            <p>Aponte a câmera para a barra de código do produto para adicionar automaticamente ao carrinho.</p>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-start-mini"
                onClick={() => setAtivo(true)}
              >
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
          <div className="camera-overlay-guide">
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
            <span>Código Lido: <strong>{feedbackLeitura}</strong></span>
          </div>
        )}
      </div>

      {ultimoCodigoLido && (
        <div className="last-scanned-bar">
          <span>Último bipado:</span>
          <code>{ultimoCodigoLido}</code>
        </div>
      )}
    </div>
  );
};
