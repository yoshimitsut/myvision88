import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface BarcodeCameraScannerProps {
  onScan: (codigo: string) => void;
  ativo: boolean;
  setAtivo: (ativo: boolean) => void;
  ultimoCodigoLido?: string | null;
}

export const BarcodeCameraScanner: React.FC<BarcodeCameraScannerProps> = ({
  onScan,
  ativo,
  setAtivo,
  ultimoCodigoLido,
}) => {
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [cameraTraseira, setCameraTraseira] = useState(true);
  const [flashAtivo, setFlashAtivo] = useState(false);
  const [suportaFlash, setSuportaFlash] = useState(false);
  const [feedbackLeitura, setFeedbackLeitura] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastCodeRef = useRef<string>('');

  const elementoId = 'baiten-barcode-camera-view';

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

  const iniciarCamera = useCallback(async () => {
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

      const cameraConfig = cameraTraseira
        ? { facingMode: { ideal: 'environment' } }
        : { facingMode: 'user' };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            // Mira retangular horizontal otimizada para códigos de barra (EAN-13)
            const w = Math.floor(Math.min(viewfinderWidth * 0.88, 320));
            const h = Math.floor(Math.min(viewfinderHeight * 0.45, 160));
            return { width: Math.max(w, 200), height: Math.max(h, 100) };
          },
          aspectRatio: 1.333333,
        },
        (decodedText) => {
          const now = Date.now();
          const cleanCode = decodedText.trim();

          // Cooldown de leitura: 2 segundos se for o mesmo código, 1 segundo se for diferente
          const intervaloMinimo = cleanCode === lastCodeRef.current ? 2200 : 1200;
          if (now - lastScanTimeRef.current < intervaloMinimo) {
            return;
          }

          lastScanTimeRef.current = now;
          lastCodeRef.current = cleanCode;

          setFeedbackLeitura(cleanCode);
          setTimeout(() => setFeedbackLeitura(null), 1000);

          onScan(cleanCode);
        },
        () => {
          // Frame sem código detectado (normal, ignora)
        }
      );

      // Testa suporte a lanterna (torch)
      try {
        const capabilities: any = html5QrCode.getRunningTrackCapabilities();
        if (capabilities && capabilities.torch) {
          setSuportaFlash(true);
        }
      } catch {
        setSuportaFlash(false);
      }
    } catch (err: any) {
      console.error('Falha ao abrir câmera do smartphone:', err);
      let msg = 'Não foi possível acessar a câmera do smartphone.';
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission')) {
        msg = 'Permissão de acesso à câmera negada. Habilite a câmera nas configurações do navegador.';
      } else if (err.name === 'NotFoundError') {
        msg = 'Nenhuma câmera encontrada neste dispositivo.';
      }
      setErroCamera(msg);
      setAtivo(false);
    } finally {
      setCarregando(false);
    }
  }, [cameraTraseira, onScan, pararCamera, setAtivo]);

  // Liga ou desliga conforme propriedade 'ativo'
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

  // Alternar entre câmera traseira e frontal
  const alternarCamera = () => {
    setCameraTraseira((prev) => !prev);
  };

  return (
    <div className="camera-scanner-wrapper">
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
              <button
                type="button"
                className="btn-camera-ctrl"
                onClick={alternarCamera}
                title="Trocar Câmera (Traseira/Frontal)"
              >
                🔄 Inverter
              </button>
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
              ? '⏹ Desligar Câmera'
              : '📸 Abrir Câmera'}
          </button>
        </div>
      </div>

      {erroCamera && (
        <div className="status-banner erro camera-error">
          <span>⚠️ {erroCamera}</span>
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
        </div>
      )}

      {/* Visor da Câmera */}
      <div className={`camera-viewport-card ${ativo ? 'camera-active' : 'camera-inactive'}`}>
        <div id={elementoId} className="camera-video-container" />

        {!ativo && (
          <div className="camera-placeholder" onClick={() => setAtivo(true)}>
            <div className="placeholder-icon-circle">
              <span className="placeholder-icon">📸</span>
            </div>
            <h4>Toque para abrir a câmera</h4>
            <p>Aponte a câmera do celular para o código de barras do produto.</p>
            <span className="btn-start-mini">Ativar Leitor por Câmera</span>
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
              Centralize a barra de código dentro da linha vermelha
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

