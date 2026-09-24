import React from 'react'
import { useLoader } from './Loader'


const Hero = () => {
  // false while the loader is showing, true the moment the curtain starts lifting
  const { revealed } = useLoader()

  return (
    <div className='w-screen h-screen bg-red-300'>
      <span
        className={`inline-block transition-all duration-1000 ease-out delay-200 motion-reduce:transition-none ${
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        Hero
      </span>
      {/* <div >
      <img src={`https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=100&w=4000&t=${Date.now()}-1`} alt="heavy" />
      <img src={`https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=100&w=4000&t=${Date.now()}-2`} alt="heavy" />
      <img src={`https://images.unsplash.com/photo-1511884642898-4c92249e20b6?q=100&w=4000&t=${Date.now()}-3`} alt="heavy" />
      <img src={`https://images.pexels.com/photos/6129603/pexels-photo-6129603.jpeg`} alt="heavy" />
      <img src={`https://images.pexels.com/photos/19832395/pexels-photo-19832395.jpeg`} alt="heavy" />
      <img src={`https://images.pexels.com/photos/5007767/pexels-photo-5007767.jpeg`} alt="heavy" />
      <img src={`https://images.pexels.com/photos/5621000/pexels-photo-5621000.jpeg`} alt="heavy" />
      <img src={`https://images.pexels.com/photos/18212099/pexels-photo-18212099.jpeg`} alt="heavy" />
      <img src={`https://images.pexels.com/photos/16197585/pexels-photo-16197585.jpeg`} alt="heavy" />
      <img src={`https://images.pexels.com/photos/37633194/pexels-photo-37633194.jpeg`} alt="heavy" />
      <img src={`https://images.pexels.com/photos/29648332/pexels-photo-29648332.jpeg`} alt="heavy" />
      <img src={`https://images.pexels.com/photos/5269075/pexels-photo-5269075.jpeg`} alt="heavy" />
      <img src={`https://images.pexels.com/photos/5300303/pexels-photo-5300303.jpeg`} alt="heavy" />
    </div> */}
    </div>
  )
}

export default Hero